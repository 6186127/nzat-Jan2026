using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;
using Workshop.Api.Data;
using Workshop.Api.Options;
using Workshop.Api.Services;
using Workshop.Api.Models;

namespace Workshop.Api.Controllers;

[ApiController]
[Route("api/gmail")]
public class GmailAuthController : ControllerBase
{
    private const string StateCachePrefix = "gmail-oauth-state:";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _environment;
    private readonly GmailOptions _options;
    private readonly GmailTokenService _gmailTokenService;

    public GmailAuthController(
        IHttpClientFactory httpClientFactory,
        IMemoryCache cache,
        AppDbContext db,
        IWebHostEnvironment environment,
        IOptions<GmailOptions> options,
        GmailTokenService gmailTokenService)
    {
        _httpClientFactory = httpClientFactory;
        _cache = cache;
        _db = db;
        _environment = environment;
        _options = options.Value;
        _gmailTokenService = gmailTokenService;
    }

    [HttpGet("connect")]
    public IActionResult Connect([FromQuery] bool redirect = false, [FromQuery] string? scopes = null)
    {
        var validationError = ValidateConfiguration();
        if (validationError is not null)
            return BadRequest(new { error = validationError });

        var resolvedScopes = ResolveScopes(scopes);
        var state = Guid.NewGuid().ToString("N");
        _cache.Set(StateCachePrefix + state, true, TimeSpan.FromMinutes(15));

        var authUrl = BuildAuthorizeUrl(state, resolvedScopes);
        if (redirect)
            return Redirect(authUrl);

        return Ok(new
        {
            authorizeUrl = authUrl,
            callbackUrl = _options.RedirectUri,
            scopes = SplitScopes(resolvedScopes),
            scopesSource = string.IsNullOrWhiteSpace(scopes) ? "configuration" : "query",
        });
    }

    [HttpGet("oauth/url")]
    public IActionResult OAuthUrl([FromQuery] string? scopes = null) =>
        Connect(redirect: false, scopes: scopes);

    [HttpGet("callback")]
    [HttpGet("oauth/callback")]
    public async Task<IActionResult> Callback(
        [FromQuery] string? code,
        [FromQuery] string? state,
        [FromQuery] string? error,
        [FromQuery(Name = "error_description")] string? errorDescription,
        CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(error))
        {
            return BadRequest(new
            {
                error,
                errorDescription,
            });
        }

        if (string.IsNullOrWhiteSpace(code))
            return BadRequest(new { error = "Missing authorization code." });

        if (string.IsNullOrWhiteSpace(state) || !_cache.TryGetValue(StateCachePrefix + state, out _))
            return BadRequest(new { error = "Missing or invalid OAuth state." });

        _cache.Remove(StateCachePrefix + state);

        var tokenResult = await ExchangeCodeForTokenAsync(code, ct);
        if (!tokenResult.Ok)
            return StatusCode(tokenResult.StatusCode, new { error = tokenResult.Error });

        var profileResult = await LoadProfileAsync(tokenResult.AccessToken, ct);
        if (!profileResult.Ok)
        {
            return StatusCode(profileResult.StatusCode, new
            {
                error = profileResult.Error,
                refreshToken = tokenResult.RefreshToken,
                accessTokenExpiresIn = tokenResult.ExpiresIn,
                scope = tokenResult.Scope,
            });
        }

        return Ok(new
        {
            message = "Gmail authorization completed. Save the refreshToken into backend configuration.",
            email = profileResult.Email,
            refreshToken = tokenResult.RefreshToken,
            accessTokenExpiresIn = tokenResult.ExpiresIn,
            scope = tokenResult.Scope,
            suggestedConfig = new
            {
                Gmail__ClientId = _options.ClientId,
                Gmail__ClientSecret = "<already configured>",
                Gmail__RedirectUri = _options.RedirectUri,
                Gmail__RefreshToken = tokenResult.RefreshToken,
            },
        });
    }

    [HttpGet("health")]
    [HttpGet("status")]
    public async Task<IActionResult> Health(CancellationToken ct, [FromQuery] string? scopes = null)
    {
        var missing = new List<string>();
        if (string.IsNullOrWhiteSpace(_options.ClientId)) missing.Add("Gmail:ClientId");
        if (string.IsNullOrWhiteSpace(_options.ClientSecret)) missing.Add("Gmail:ClientSecret");
        if (string.IsNullOrWhiteSpace(_options.RedirectUri)) missing.Add("Gmail:RedirectUri");
        var apiMissing = new List<string>();
        if (string.IsNullOrWhiteSpace(_options.RefreshToken)) apiMissing.Add("Gmail:RefreshToken");
        var resolvedScopes = ResolveScopes(scopes);

        string? authorizedEmail = null;
        string? grantedScopes = null;
        if (missing.Count == 0 && apiMissing.Count == 0)
        {
            var tokenResult = await _gmailTokenService.RefreshAccessTokenAsync(ct);
            if (tokenResult.Ok)
            {
                grantedScopes = tokenResult.Scope;
                var profileResult = await LoadProfileAsync(tokenResult.AccessToken, ct);
                if (profileResult.Ok)
                    authorizedEmail = profileResult.Email;
            }
        }

        return Ok(new
        {
            configured = missing.Count == 0,
            missing,
            apiReady = missing.Count == 0 && apiMissing.Count == 0,
            apiMissing,
            suggestedLocalCallback = "http://localhost:5227/api/gmail/oauth/callback",
            currentRedirectUri = _options.RedirectUri,
            scopes = SplitScopes(resolvedScopes),
            scopesSource = string.IsNullOrWhiteSpace(scopes) ? "configuration" : "query",
            authorizedEmail,
            grantedScopes = SplitScopes(grantedScopes),
        });
    }

    [HttpPost("send")]
    public async Task<IActionResult> Send([FromBody] GmailSendRequest req, CancellationToken ct)
    {
        if (req is null || string.IsNullOrWhiteSpace(req.To))
            return BadRequest(new { error = "To is required." });
        if (string.IsNullOrWhiteSpace(req.Subject))
            return BadRequest(new { error = "Subject is required." });

        var recipients = NormalizeRecipientAddresses(req.To);
        if (recipients.Length == 0)
            return BadRequest(new { error = "At least one valid recipient email is required." });

        var tokenResult = await _gmailTokenService.RefreshAccessTokenAsync(ct);
        if (!tokenResult.Ok)
            return StatusCode(tokenResult.StatusCode, new { error = tokenResult.Error });

        var rawMessage = BuildRawMessage(
            string.Join(", ", recipients),
            req.Subject,
            req.Body ?? "",
            req.ReplyToRfcMessageId,
            req.ReferencesHeader);
        var client = _httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://gmail.googleapis.com/gmail/v1/users/me/messages/send");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenResult.AccessToken);
        request.Content = JsonContent.Create(new GmailSendApiRequest(rawMessage, req.ThreadId?.Trim()));

        using var response = await client.SendAsync(request, ct);
        var payload = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            return StatusCode((int)response.StatusCode, new
            {
                error = payload,
                grantedScopes = SplitScopes(tokenResult.Scope),
                configuredScopes = SplitScopes(_options.Scopes),
            });

        var sendResult = JsonSerializer.Deserialize<GmailSendApiResponse>(payload, JsonOptions);
        var subject = req.Subject.Trim();
        var body = req.Body ?? "";
        var sentMessageId = sendResult?.Id ?? "";
        string? sentRfcMessageId = null;
        string? sentReferencesHeader = null;
        if (!string.IsNullOrWhiteSpace(sentMessageId))
        {
            var sentDetails = await LoadMessageDetailsAsync(client, tokenResult.AccessToken, sentMessageId, ct);
            sentRfcMessageId = sentDetails?.RfcMessageId;
            sentReferencesHeader = sentDetails?.ReferencesHeader;

            await UpsertMessageLogAsync(
                gmailMessageId: sentMessageId,
                gmailThreadId: sendResult?.ThreadId,
                internalDateMs: sendResult?.InternalDate is long internalDate ? internalDate : null,
                direction: "sent",
                counterpartyEmail: string.Join(", ", recipients),
                fromAddress: null,
                toAddress: string.Join(", ", recipients),
                subject: subject,
                body: body,
                snippet: body.Length > 240 ? body[..240] : body,
                correlationId: req.CorrelationId?.Trim(),
                rfcMessageId: sentRfcMessageId,
                referencesHeader: sentReferencesHeader,
                attachments: [],
                ct: ct);
        }

        return Ok(new
        {
            message = "Email sent via Gmail API.",
            id = sentMessageId,
            threadId = sendResult?.ThreadId ?? "",
            rfcMessageId = sentRfcMessageId ?? "",
            referencesHeader = sentReferencesHeader ?? "",
            scope = tokenResult.Scope,
            accessTokenExpiresIn = tokenResult.ExpiresIn,
        });
    }

    [HttpGet("thread")]
    public async Task<IActionResult> GetThread(
        [FromQuery] string? counterpartyEmail,
        [FromQuery] string? correlationId,
        [FromQuery] int limit = 20,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(counterpartyEmail) && string.IsNullOrWhiteSpace(correlationId))
            return BadRequest(new { error = "counterpartyEmail or correlationId is required." });

        var tokenResult = await _gmailTokenService.RefreshAccessTokenAsync(ct);
        if (!tokenResult.Ok)
            return StatusCode(tokenResult.StatusCode, new { error = tokenResult.Error });

        var normalizedCorrelationId = correlationId?.Trim();
        if (!string.IsNullOrWhiteSpace(normalizedCorrelationId))
        {
            var isInactive = await _db.InactiveGmailCorrelations.AsNoTracking()
                .AnyAsync(x => x.CorrelationId == normalizedCorrelationId, ct);
            if (isInactive)
            {
                return Ok(new GmailThreadResponse(
                    [],
                    0,
                    false,
                    false,
                    "",
                    "",
                    "Correlation is inactive. Gmail sync skipped."
                ));
            }
        }

        var normalizedCounterpartyEmail = counterpartyEmail?.Trim() ?? "";
        var counterpartyEmails = SplitEmailAddresses(normalizedCounterpartyEmail);
        var queryTerms = new List<string>();
        if (counterpartyEmails.Length > 0)
        {
            queryTerms.Add(counterpartyEmails.Length == 1
                ? counterpartyEmails[0]
                : $"({string.Join(" OR ", counterpartyEmails)})");
        }
        if (!string.IsNullOrWhiteSpace(normalizedCorrelationId))
            queryTerms.Add($"\"{normalizedCorrelationId}\"");
        var gmailQuery = string.Join(" ", queryTerms);

        var client = _httpClientFactory.CreateClient();
        string? syncWarning = null;
        List<GmailMessageRef> messageRefs = [];

        var listUrl =
            $"https://gmail.googleapis.com/gmail/v1/users/me/messages?q={Uri.EscapeDataString(gmailQuery)}&maxResults={Math.Clamp(limit, 1, 50)}";
        using (var listRequest = new HttpRequestMessage(HttpMethod.Get, listUrl))
        {
            listRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenResult.AccessToken);

            using var listResponse = await client.SendAsync(listRequest, ct);
            var listPayload = await listResponse.Content.ReadAsStringAsync(ct);
            if (listResponse.IsSuccessStatusCode)
            {
                var listResult = JsonSerializer.Deserialize<GmailMessageListResponse>(listPayload, JsonOptions);
                messageRefs = listResult?.Messages ?? [];
            }
            else
            {
                syncWarning = "Gmail thread sync unavailable. Re-consent with gmail.readonly or gmail.modify to read replies.";
            }
        }

        foreach (var messageRef in messageRefs)
        {
            if (string.IsNullOrWhiteSpace(messageRef.Id))
                continue;

            using var messageRequest = new HttpRequestMessage(
                HttpMethod.Get,
                $"https://gmail.googleapis.com/gmail/v1/users/me/messages/{Uri.EscapeDataString(messageRef.Id)}?format=full");
            messageRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenResult.AccessToken);

            using var messageResponse = await client.SendAsync(messageRequest, ct);
            var messagePayload = await messageResponse.Content.ReadAsStringAsync(ct);
            if (!messageResponse.IsSuccessStatusCode)
                continue;

            var message = JsonSerializer.Deserialize<GmailMessageResponse>(messagePayload, JsonOptions);
            if (message is null)
                continue;

            var from = GetHeader(message.Payload, "From");
            var to = GetHeader(message.Payload, "To");
            var subject = DecodeMimeWords(GetHeader(message.Payload, "Subject"));
            var body = ExtractBody(message.Payload);
            var snippet = message.Snippet ?? "";
            var rfcMessageId = GetHeader(message.Payload, "Message-Id");
            var referencesHeader = GetHeader(message.Payload, "References");
            var attachments = ExtractAttachments(message.Payload);
            var matchesCounterparty = counterpartyEmails.Length == 0 ||
                counterpartyEmails.Any(email =>
                    from.Contains(email, StringComparison.OrdinalIgnoreCase) ||
                    to.Contains(email, StringComparison.OrdinalIgnoreCase));
            var matchesCorrelation = string.IsNullOrWhiteSpace(normalizedCorrelationId) ||
                subject.Contains(normalizedCorrelationId, StringComparison.OrdinalIgnoreCase) ||
                body.Contains(normalizedCorrelationId, StringComparison.OrdinalIgnoreCase) ||
                snippet.Contains(normalizedCorrelationId, StringComparison.OrdinalIgnoreCase);

            if (!matchesCounterparty || !matchesCorrelation)
                continue;

            var direction = counterpartyEmails.Any(email => from.Contains(email, StringComparison.OrdinalIgnoreCase))
                ? "reply"
                : "sent";
            var normalizedBody = string.IsNullOrWhiteSpace(body) ? snippet : body;

            await UpsertMessageLogAsync(
                gmailMessageId: message.Id ?? "",
                gmailThreadId: message.ThreadId,
                internalDateMs: message.InternalDate,
                direction: direction,
                counterpartyEmail: normalizedCounterpartyEmail,
                fromAddress: from,
                toAddress: to,
                subject: subject,
                body: normalizedBody,
                snippet: snippet,
                correlationId: normalizedCorrelationId,
                rfcMessageId: rfcMessageId,
                referencesHeader: referencesHeader,
                attachments: attachments,
                ct: ct);
        }

        var logsQuery = _db.GmailMessageLogs.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(normalizedCorrelationId))
        {
            logsQuery = logsQuery.Where(x => x.CorrelationId == normalizedCorrelationId);
        }
        else if (!string.IsNullOrWhiteSpace(normalizedCounterpartyEmail))
        {
            logsQuery = logsQuery.Where(x => x.CounterpartyEmail == normalizedCounterpartyEmail);
        }

        var logs = await logsQuery
            .OrderByDescending(x => x.InternalDateMs ?? 0)
            .ThenByDescending(x => x.Id)
            .Take(Math.Clamp(limit, 1, 50))
            .ToListAsync(ct);

        var events = logs.Select(log => new GmailThreadEventResponse(
            log.GmailMessageId,
            log.Direction == "reply" ? "reply" : log.Direction == "reminder" ? "reminder" : "sent",
            NormalizeInternalDate(log.InternalDateMs),
            log.Body ?? log.Snippet ?? "",
            log.FromAddress ?? "",
            log.ToAddress ?? "",
            log.Subject ?? "",
            log.Body ?? log.Snippet ?? "",
            log.GmailThreadId ?? "",
            !log.IsRead && string.Equals(log.Direction, "reply", StringComparison.OrdinalIgnoreCase),
            log.DetectedPoNumber ?? "",
            log.RfcMessageId ?? "",
            log.ReferencesHeader ?? "",
            DeserializeAttachments(log.AttachmentsJson)
        )).ToList();

        var unreadReplyCount = logs.Count(x =>
            string.Equals(x.Direction, "reply", StringComparison.OrdinalIgnoreCase) && !x.IsRead);
        var detectedPoNumber = logs
            .Where(x => !string.IsNullOrWhiteSpace(x.DetectedPoNumber))
            .OrderByDescending(x => x.InternalDateMs ?? 0)
            .Select(x => x.DetectedPoNumber!)
            .FirstOrDefault();

        return Ok(new GmailThreadResponse(
            events,
            unreadReplyCount,
            logs.Any(x => string.Equals(x.Direction, "reply", StringComparison.OrdinalIgnoreCase)),
            !string.IsNullOrWhiteSpace(detectedPoNumber),
            detectedPoNumber ?? "",
            logs.FirstOrDefault(x => string.Equals(x.Direction, "reply", StringComparison.OrdinalIgnoreCase)) is { } latestReply
                ? NormalizeInternalDate(latestReply.InternalDateMs)
                : "",
            syncWarning ?? ""
        ));
    }

    [HttpPost("thread/read")]
    public async Task<IActionResult> MarkThreadRead([FromBody] GmailThreadReadRequest req, CancellationToken ct)
    {
        if (req is null || string.IsNullOrWhiteSpace(req.CounterpartyEmail))
            return BadRequest(new { error = "counterpartyEmail is required." });

        var normalizedCounterpartyEmail = req.CounterpartyEmail.Trim();
        var normalizedCorrelationId = req.CorrelationId?.Trim();

        var query = _db.GmailMessageLogs
            .Where(x => x.CounterpartyEmail == normalizedCounterpartyEmail)
            .Where(x => x.Direction == "reply" && !x.IsRead);

        if (!string.IsNullOrWhiteSpace(normalizedCorrelationId))
            query = query.Where(x => x.CorrelationId == normalizedCorrelationId);

        var logs = await query.ToListAsync(ct);
        var now = DateTime.UtcNow;
        foreach (var log in logs)
        {
            log.IsRead = true;
            log.ReadAt = now;
            log.UpdatedAt = now;
        }

        await _db.SaveChangesAsync(ct);
        return Ok(new { updated = logs.Count });
    }

    [HttpGet("debug/token")]
    public async Task<IActionResult> DebugToken(CancellationToken ct)
    {
        var tokenResult = await _gmailTokenService.RefreshAccessTokenAsync(ct);
        if (!tokenResult.Ok)
            return StatusCode(tokenResult.StatusCode, new { error = tokenResult.Error });

        var profileResult = await LoadProfileAsync(tokenResult.AccessToken, ct);

        return Ok(new
        {
            grantedScopes = SplitScopes(tokenResult.Scope),
            rawScope = tokenResult.Scope,
            configuredScopes = SplitScopes(_options.Scopes),
            emailResolved = profileResult.Ok ? profileResult.Email : null,
            profileError = profileResult.Ok ? null : profileResult.Error,
        });
    }

    [HttpGet("attachment")]
    public async Task<IActionResult> GetAttachment(
        [FromQuery] string? messageId,
        [FromQuery] string? attachmentId,
        [FromQuery] string? fileName,
        [FromQuery] string? mimeType,
        [FromQuery] bool inline = false,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(messageId))
            return BadRequest(new { error = "messageId is required." });
        if (string.IsNullOrWhiteSpace(attachmentId))
            return BadRequest(new { error = "attachmentId is required." });

        var resolvedMimeType = string.IsNullOrWhiteSpace(mimeType) ? "application/octet-stream" : mimeType.Trim();
        var resolvedFileName = string.IsNullOrWhiteSpace(fileName) ? "attachment" : fileName.Trim();
        var cachedFilePath = await EnsureAttachmentCachedAsync(
            messageId.Trim(),
            attachmentId.Trim(),
            resolvedFileName,
            resolvedMimeType,
            ct);
        if (string.IsNullOrWhiteSpace(cachedFilePath) || !System.IO.File.Exists(cachedFilePath))
            return NotFound(new { error = "Attachment content not found." });

        var bytes = await System.IO.File.ReadAllBytesAsync(cachedFilePath, ct);
        if (inline)
        {
            Response.Headers[HeaderNames.ContentDisposition] =
                $"inline; filename*=UTF-8''{Uri.EscapeDataString(resolvedFileName)}";
            return File(bytes, resolvedMimeType);
        }

        return File(bytes, resolvedMimeType, resolvedFileName);
    }

    private async Task<string?> EnsureAttachmentCachedAsync(
        string messageId,
        string attachmentId,
        string fileName,
        string mimeType,
        CancellationToken ct)
    {
        var log = await _db.GmailMessageLogs.FirstOrDefaultAsync(x => x.GmailMessageId == messageId, ct);
        var attachments = DeserializeAttachments(log?.AttachmentsJson);
        var attachment = attachments.FirstOrDefault(x => string.Equals(x.AttachmentId, attachmentId, StringComparison.Ordinal));

        if (!string.IsNullOrWhiteSpace(attachment?.CachedRelativePath))
        {
            var cachedPath = Path.Combine(_environment.ContentRootPath, attachment.CachedRelativePath);
            if (System.IO.File.Exists(cachedPath))
                return cachedPath;
        }

        var tokenResult = await _gmailTokenService.RefreshAccessTokenAsync(ct);
        if (!tokenResult.Ok)
            return null;

        var client = _httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"https://gmail.googleapis.com/gmail/v1/users/me/messages/{Uri.EscapeDataString(messageId)}/attachments/{Uri.EscapeDataString(attachmentId)}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenResult.AccessToken);

        using var response = await client.SendAsync(request, ct);
        var payload = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            return null;

        var attachmentPayload = JsonSerializer.Deserialize<GmailAttachmentContentResponse>(payload, JsonOptions);
        if (attachmentPayload is null || string.IsNullOrWhiteSpace(attachmentPayload.Data))
            return null;

        var bytes = DecodeBase64UrlToBytes(attachmentPayload.Data);
        if (bytes.Length == 0)
            return null;

        var directory = Path.Combine(_environment.ContentRootPath, "App_Data", "gmail-attachments");
        Directory.CreateDirectory(directory);

        var safeBaseName = SanitizeFileName(Path.GetFileNameWithoutExtension(fileName));
        var shortenedBaseName = safeBaseName.Length > 40 ? safeBaseName[..40] : safeBaseName;
        var extension = ResolveFileExtension(fileName, mimeType);
        var messageHash = ComputeShortHash(messageId, 12);
        var attachmentHash = ComputeShortHash(attachmentId, 12);
        var relativePath = Path.Combine(
            "App_Data",
            "gmail-attachments",
            $"{messageHash}_{attachmentHash}_{shortenedBaseName}{extension}");
        var fullPath = Path.Combine(_environment.ContentRootPath, relativePath);

        await System.IO.File.WriteAllBytesAsync(fullPath, bytes, ct);

        if (log is not null)
        {
            var updatedAttachments = attachments
                .Select(item => item.AttachmentId == attachmentId
                    ? item with
                    {
                        CachedRelativePath = relativePath,
                        CachedAtUtc = DateTime.UtcNow,
                    }
                    : item)
                .ToList();
            log.AttachmentsJson = JsonSerializer.Serialize(updatedAttachments, JsonOptions);
            log.HasAttachments = updatedAttachments.Count > 0;
            log.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }

        return fullPath;
    }

    public sealed record GmailSendRequest(
        string To,
        string Subject,
        string? Body,
        string? CorrelationId,
        string? ThreadId,
        string? ReplyToRfcMessageId,
        string? ReferencesHeader);
    public sealed record GmailThreadReadRequest(string CounterpartyEmail, string? CorrelationId);

    private async Task UpsertMessageLogAsync(
        string gmailMessageId,
        string? gmailThreadId,
        long? internalDateMs,
        string direction,
        string counterpartyEmail,
        string? fromAddress,
        string? toAddress,
        string? subject,
        string? body,
        string? snippet,
        string? correlationId,
        string? rfcMessageId,
        string? referencesHeader,
        List<GmailAttachmentDescriptor> attachments,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(gmailMessageId))
            return;

        var existing = await _db.GmailMessageLogs.FirstOrDefaultAsync(x => x.GmailMessageId == gmailMessageId, ct);
        if (existing is null)
        {
            existing = new GmailMessageLog
            {
                GmailMessageId = gmailMessageId,
                CreatedAt = DateTime.UtcNow,
            };
            _db.GmailMessageLogs.Add(existing);
        }

        existing.GmailThreadId = gmailThreadId?.Trim();
        existing.InternalDateMs = internalDateMs;
        existing.Direction = direction.Trim();
        existing.CounterpartyEmail = counterpartyEmail.Trim();
        existing.FromAddress = NullIfBlank(fromAddress);
        existing.ToAddress = NullIfBlank(toAddress);
        existing.Subject = NullIfBlank(subject);
        existing.Body = NullIfBlank(body);
        existing.Snippet = NullIfBlank(snippet);
        existing.CorrelationId = NullIfBlank(correlationId);
        existing.RfcMessageId = NullIfBlank(rfcMessageId);
        existing.ReferencesHeader = NullIfBlank(referencesHeader);
        existing.HasAttachments = attachments.Count > 0;
        existing.AttachmentsJson = attachments.Count > 0 ? JsonSerializer.Serialize(attachments, JsonOptions) : null;
        existing.DetectedPoNumber = ExtractPoNumber(subject, body, snippet);
        if (existing.Id == 0)
        {
            existing.IsRead = !string.Equals(direction, "reply", StringComparison.OrdinalIgnoreCase);
            existing.ReadAt = existing.IsRead ? DateTime.UtcNow : null;
        }
        existing.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
    }

    private static string? NullIfBlank(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private string? ValidateConfiguration()
    {
        if (string.IsNullOrWhiteSpace(_options.ClientId))
            return "Missing Gmail:ClientId.";
        if (string.IsNullOrWhiteSpace(_options.ClientSecret))
            return "Missing Gmail:ClientSecret.";
        if (string.IsNullOrWhiteSpace(_options.RedirectUri))
            return "Missing Gmail:RedirectUri.";
        return null;
    }

    private string BuildAuthorizeUrl(string state, string scopes)
    {
        var query = new Dictionary<string, string?>
        {
            ["client_id"] = _options.ClientId,
            ["redirect_uri"] = _options.RedirectUri,
            ["response_type"] = "code",
            ["scope"] = scopes,
            ["access_type"] = "offline",
            ["prompt"] = "consent",
            ["include_granted_scopes"] = "true",
            ["state"] = state,
        };

        var queryString = string.Join("&", query.Select(x =>
            $"{Uri.EscapeDataString(x.Key)}={Uri.EscapeDataString(x.Value ?? "")}"));

        return $"https://accounts.google.com/o/oauth2/v2/auth?{queryString}";
    }

    private async Task<GmailExchangeResult> ExchangeCodeForTokenAsync(string code, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://oauth2.googleapis.com/token");
        request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_id"] = _options.ClientId,
            ["client_secret"] = _options.ClientSecret,
            ["code"] = code,
            ["grant_type"] = "authorization_code",
            ["redirect_uri"] = _options.RedirectUri,
        });

        using var response = await client.SendAsync(request, ct);
        var payload = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            return GmailExchangeResult.Fail((int)response.StatusCode, payload);

        var token = JsonSerializer.Deserialize<GmailTokenResponse>(payload, JsonOptions);
        if (token is null || string.IsNullOrWhiteSpace(token.AccessToken))
            return GmailExchangeResult.Fail(502, "Token response was empty or invalid.");
        if (string.IsNullOrWhiteSpace(token.RefreshToken))
            return GmailExchangeResult.Fail(502, "Google did not return a refresh token. Re-consent with prompt=consent and access_type=offline.");

        return GmailExchangeResult.Success(
            token.AccessToken,
            token.RefreshToken,
            token.ExpiresIn,
            token.Scope ?? "");
    }

    private async Task<GmailProfileResult> LoadProfileAsync(string accessToken, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, "https://www.googleapis.com/oauth2/v2/userinfo");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        using var response = await client.SendAsync(request, ct);
        var payload = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            return GmailProfileResult.Fail((int)response.StatusCode, payload);

        var profile = JsonSerializer.Deserialize<GmailUserInfoResponse>(payload, JsonOptions);
        if (profile is null || string.IsNullOrWhiteSpace(profile.Email))
            return GmailProfileResult.Fail(502, "Unable to resolve Gmail profile email.");

        return GmailProfileResult.Success(profile.Email);
    }

    private string ResolveScopes(string? scopes) =>
        string.IsNullOrWhiteSpace(scopes)
            ? string.Join(" ", SplitScopes(_options.Scopes))
            : string.Join(" ", SplitScopes(scopes));

    private static string[] SplitScopes(string? scopes) =>
        (scopes ?? "")
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Distinct(StringComparer.Ordinal)
            .ToArray();

    private static string[] SplitEmailAddresses(string? value) =>
        (value ?? "")
            .Split(new[] { ',', ';', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(item => !string.IsNullOrWhiteSpace(item))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

    private static string[] NormalizeRecipientAddresses(string? value) =>
        SplitEmailAddresses(value)
            .Select(item =>
            {
                var angleMatch = System.Text.RegularExpressions.Regex.Match(item, "<([^>]+)>");
                return angleMatch.Success ? angleMatch.Groups[1].Value.Trim() : item.Trim();
            })
            .Where(item => System.Text.RegularExpressions.Regex.IsMatch(
                item,
                @"^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

    private static string BuildRawMessage(
        string to,
        string subject,
        string body,
        string? replyToRfcMessageId,
        string? referencesHeader)
    {
        var headers = new List<string>
        {
            $"To: {to}",
            $"Subject: {EncodeMimeHeader(subject)}",
            "Content-Type: text/plain; charset=utf-8",
            "MIME-Version: 1.0",
        };

        if (!string.IsNullOrWhiteSpace(replyToRfcMessageId))
            headers.Add($"In-Reply-To: {replyToRfcMessageId.Trim()}");

        var normalizedReferences = BuildReferencesHeader(referencesHeader, replyToRfcMessageId);
        if (!string.IsNullOrWhiteSpace(normalizedReferences))
            headers.Add($"References: {normalizedReferences}");

        headers.Add("");
        headers.Add(body);

        var mime = string.Join("\r\n", headers);
        var bytes = Encoding.UTF8.GetBytes(mime);
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    private static string? BuildReferencesHeader(string? referencesHeader, string? replyToRfcMessageId)
    {
        var values = new List<string>();
        if (!string.IsNullOrWhiteSpace(referencesHeader))
            values.AddRange(referencesHeader.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
        if (!string.IsNullOrWhiteSpace(replyToRfcMessageId))
            values.Add(replyToRfcMessageId.Trim());

        var normalized = values
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        return normalized.Length == 0 ? null : string.Join(" ", normalized);
    }

    private static string GetHeader(GmailMessagePart? payload, string name)
    {
        if (payload?.Headers is null) return "";
        return payload.Headers.FirstOrDefault(x => string.Equals(x.Name, name, StringComparison.OrdinalIgnoreCase))?.Value ?? "";
    }

    private static string ExtractBody(GmailMessagePart? payload)
    {
        if (payload is null) return "";

        if (string.Equals(payload.MimeType, "text/plain", StringComparison.OrdinalIgnoreCase) &&
            !string.IsNullOrWhiteSpace(payload.Body?.Data))
            return DecodeBase64Url(payload.Body.Data);

        foreach (var part in payload.Parts ?? [])
        {
            var body = ExtractBody(part);
            if (!string.IsNullOrWhiteSpace(body))
                return body;
        }

        if (!string.IsNullOrWhiteSpace(payload.Body?.Data))
            return DecodeBase64Url(payload.Body.Data);

        return "";
    }

    private async Task<GmailMessageDetailContext?> LoadMessageDetailsAsync(
        HttpClient client,
        string accessToken,
        string gmailMessageId,
        CancellationToken ct)
    {
        using var messageRequest = new HttpRequestMessage(
            HttpMethod.Get,
            $"https://gmail.googleapis.com/gmail/v1/users/me/messages/{Uri.EscapeDataString(gmailMessageId)}?format=full");
        messageRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        using var messageResponse = await client.SendAsync(messageRequest, ct);
        if (!messageResponse.IsSuccessStatusCode)
            return null;

        var payload = await messageResponse.Content.ReadAsStringAsync(ct);
        var message = JsonSerializer.Deserialize<GmailMessageResponse>(payload, JsonOptions);
        if (message is null)
            return null;

        return new GmailMessageDetailContext(
            GetHeader(message.Payload, "Message-Id"),
            GetHeader(message.Payload, "References"));
    }

    private static List<GmailAttachmentDescriptor> ExtractAttachments(GmailMessagePart? payload)
    {
        var attachments = new List<GmailAttachmentDescriptor>();
        AppendAttachments(payload, attachments);
        return attachments;
    }

    private static void AppendAttachments(GmailMessagePart? payload, List<GmailAttachmentDescriptor> attachments)
    {
        if (payload is null)
            return;

        if (!string.IsNullOrWhiteSpace(payload.Filename) || !string.IsNullOrWhiteSpace(payload.Body?.AttachmentId))
        {
            attachments.Add(new GmailAttachmentDescriptor(
                payload.Filename ?? "attachment",
                payload.MimeType ?? "application/octet-stream",
                payload.Body?.Size,
                payload.Body?.AttachmentId));
        }

        foreach (var part in payload.Parts ?? [])
            AppendAttachments(part, attachments);
    }

    private static List<GmailAttachmentDescriptor> DeserializeAttachments(string? attachmentsJson)
    {
        if (string.IsNullOrWhiteSpace(attachmentsJson))
            return [];

        try
        {
            return JsonSerializer.Deserialize<List<GmailAttachmentDescriptor>>(attachmentsJson, JsonOptions) ?? [];
        }
        catch
        {
            return [];
        }
    }

    private static string SanitizeFileName(string value)
    {
        var normalized = string.IsNullOrWhiteSpace(value) ? "attachment" : value.Trim();
        var invalidChars = Path.GetInvalidFileNameChars();
        var cleaned = new string(normalized.Select(ch => invalidChars.Contains(ch) ? '_' : ch).ToArray()).Trim();
        return string.IsNullOrWhiteSpace(cleaned) ? "attachment" : cleaned;
    }

    private static string ResolveFileExtension(string fileName, string mimeType)
    {
        var existingExtension = Path.GetExtension(fileName);
        if (!string.IsNullOrWhiteSpace(existingExtension))
            return existingExtension;

        return mimeType.ToLowerInvariant() switch
        {
            "application/pdf" => ".pdf",
            "image/png" => ".png",
            "image/jpeg" => ".jpg",
            "image/jpg" => ".jpg",
            "image/gif" => ".gif",
            "text/plain" => ".txt",
            _ => ".bin",
        };
    }

    private static string ComputeShortHash(string value, int length)
    {
        if (length <= 0)
            return "";

        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        var hex = Convert.ToHexString(bytes).ToLowerInvariant();
        return hex.Length <= length ? hex : hex[..length];
    }

    private static string DecodeBase64Url(string value)
    {
        var bytes = DecodeBase64UrlToBytes(value);
        if (bytes.Length == 0)
            return "";

        try
        {
            return Encoding.UTF8.GetString(bytes);
        }
        catch
        {
            return "";
        }
    }

    private static byte[] DecodeBase64UrlToBytes(string value)
    {
        var normalized = value.Replace('-', '+').Replace('_', '/');
        normalized = normalized.PadRight(normalized.Length + ((4 - normalized.Length % 4) % 4), '=');
        try
        {
            return Convert.FromBase64String(normalized);
        }
        catch
        {
            return [];
        }
    }

    private static string NormalizeDateHeader(string value)
    {
        if (DateTimeOffset.TryParse(value, out var parsed))
            return parsed.ToLocalTime().ToString("yyyy-MM-dd HH:mm:ss");
        return value;
    }

    private static string NormalizeInternalDate(long? value)
    {
        if (!value.HasValue || value.Value <= 0) return "";
        try
        {
            return DateTimeOffset.FromUnixTimeMilliseconds(value.Value).ToLocalTime().ToString("yyyy-MM-dd HH:mm:ss");
        }
        catch
        {
            return "";
        }
    }

    private static string? ExtractPoNumber(params string?[] values)
    {
        var pattern = @"\bPO[-\s]?(?:[A-Z]{0,4}[-\s]?)?\d{2,}[A-Z0-9-]*\b";
        foreach (var value in values)
        {
            if (string.IsNullOrWhiteSpace(value)) continue;
            var match = System.Text.RegularExpressions.Regex.Match(
                value,
                pattern,
                System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (match.Success)
                return match.Value.Trim();
        }
        return null;
    }

    private static string DecodeMimeWords(string value)
    {
        if (string.IsNullOrWhiteSpace(value) || !value.Contains("=?"))
            return value;

        try
        {
            var pattern = @"=\?([^?]+)\?([bBqQ])\?([^?]+)\?=";
            return System.Text.RegularExpressions.Regex.Replace(value, pattern, match =>
            {
                var charset = match.Groups[1].Value;
                var encoding = match.Groups[2].Value;
                var text = match.Groups[3].Value;
                var bytes = encoding.Equals("B", StringComparison.OrdinalIgnoreCase)
                    ? Convert.FromBase64String(text)
                    : Encoding.UTF8.GetBytes(text.Replace('_', ' '));
                return Encoding.GetEncoding(charset).GetString(bytes);
            });
        }
        catch
        {
            return value;
        }
    }

    private static string EncodeMimeHeader(string value)
    {
        var base64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(value));
        return $"=?UTF-8?B?{base64}?=";
    }

    private sealed record GmailSendApiRequest(
        [property: JsonPropertyName("raw")] string Raw,
        [property: JsonPropertyName("threadId")] string? ThreadId);

    private sealed class GmailSendApiResponse
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = "";

        [JsonPropertyName("threadId")]
        public string ThreadId { get; set; } = "";

        [JsonPropertyName("internalDate")]
        [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
        public long? InternalDate { get; set; }
    }

    private sealed class GmailMessageListResponse
    {
        [JsonPropertyName("messages")]
        public List<GmailMessageRef>? Messages { get; set; }
    }

    private sealed class GmailMessageRef
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }
    }

    private sealed class GmailMessageResponse
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("threadId")]
        public string? ThreadId { get; set; }

        [JsonPropertyName("internalDate")]
        [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
        public long? InternalDate { get; set; }

        [JsonPropertyName("snippet")]
        public string? Snippet { get; set; }

        [JsonPropertyName("payload")]
        public GmailMessagePart? Payload { get; set; }
    }

    private sealed class GmailMessagePart
    {
        [JsonPropertyName("mimeType")]
        public string? MimeType { get; set; }

        [JsonPropertyName("filename")]
        public string? Filename { get; set; }

        [JsonPropertyName("headers")]
        public List<GmailHeader>? Headers { get; set; }

        [JsonPropertyName("parts")]
        public List<GmailMessagePart>? Parts { get; set; }

        [JsonPropertyName("body")]
        public GmailMessageBody? Body { get; set; }
    }

    private sealed class GmailHeader
    {
        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("value")]
        public string? Value { get; set; }
    }

    private sealed class GmailMessageBody
    {
        [JsonPropertyName("data")]
        public string? Data { get; set; }

        [JsonPropertyName("attachmentId")]
        public string? AttachmentId { get; set; }

        [JsonPropertyName("size")]
        public int? Size { get; set; }
    }

    private sealed class GmailAttachmentContentResponse
    {
        [JsonPropertyName("data")]
        public string? Data { get; set; }

        [JsonPropertyName("size")]
        public int? Size { get; set; }
    }

    public sealed record GmailThreadEventResponse(
        string Id,
        string Type,
        string Timestamp,
        string Description,
        string From,
        string To,
        string Subject,
        string Body,
        string ThreadId,
        bool Unread,
        string DetectedPoNumber,
        string RfcMessageId,
        string ReferencesHeader,
        List<GmailAttachmentDescriptor> Attachments
    );

    public sealed record GmailThreadResponse(
        List<GmailThreadEventResponse> Events,
        int UnreadReplyCount,
        bool HasReply,
        bool HasPo,
        string DetectedPoNumber,
        string LastReplyTimestamp,
        string SyncWarning
    );

    private sealed class GmailTokenResponse
    {
        [JsonPropertyName("access_token")]
        public string AccessToken { get; set; } = "";

        [JsonPropertyName("refresh_token")]
        public string? RefreshToken { get; set; }

        [JsonPropertyName("expires_in")]
        public int ExpiresIn { get; set; }

        [JsonPropertyName("scope")]
        public string? Scope { get; set; }
    }

    private sealed class GmailUserInfoResponse
    {
        [JsonPropertyName("email")]
        public string Email { get; set; } = "";
    }

    public sealed record GmailAttachmentDescriptor(
        string FileName,
        string MimeType,
        int? Size,
        string? AttachmentId,
        string? CachedRelativePath = null,
        DateTime? CachedAtUtc = null);

    private sealed record GmailMessageDetailContext(
        string? RfcMessageId,
        string? ReferencesHeader);

    private sealed class GmailExchangeResult
    {
        public bool Ok { get; private init; }
        public int StatusCode { get; private init; }
        public string? Error { get; private init; }
        public string AccessToken { get; private init; } = "";
        public string RefreshToken { get; private init; } = "";
        public int ExpiresIn { get; private init; }
        public string Scope { get; private init; } = "";

        public static GmailExchangeResult Fail(int statusCode, string error) =>
            new()
            {
                Ok = false,
                StatusCode = statusCode,
                Error = error,
            };

        public static GmailExchangeResult Success(
            string accessToken,
            string refreshToken,
            int expiresIn,
            string scope) =>
            new()
            {
                Ok = true,
                StatusCode = 200,
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresIn = expiresIn,
                Scope = scope,
            };
    }

    private sealed class GmailProfileResult
    {
        public bool Ok { get; private init; }
        public int StatusCode { get; private init; }
        public string? Error { get; private init; }
        public string Email { get; private init; } = "";

        public static GmailProfileResult Fail(int statusCode, string error) =>
            new()
            {
                Ok = false,
                StatusCode = statusCode,
                Error = error,
            };

        public static GmailProfileResult Success(string email) =>
            new()
            {
                Ok = true,
                StatusCode = 200,
                Email = email,
            };
    }
}
