using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Workshop.Api.Options;
using Workshop.Api.Services;

namespace Workshop.Api.Controllers;

[ApiController]
[Route("api/gmail")]
public class GmailAuthController : ControllerBase
{
    private const string StateCachePrefix = "gmail-oauth-state:";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;
    private readonly GmailOptions _options;
    private readonly GmailTokenService _gmailTokenService;

    public GmailAuthController(
        IHttpClientFactory httpClientFactory,
        IMemoryCache cache,
        IOptions<GmailOptions> options,
        GmailTokenService gmailTokenService)
    {
        _httpClientFactory = httpClientFactory;
        _cache = cache;
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

        var tokenResult = await _gmailTokenService.RefreshAccessTokenAsync(ct);
        if (!tokenResult.Ok)
            return StatusCode(tokenResult.StatusCode, new { error = tokenResult.Error });

        var rawMessage = BuildRawMessage(req.To.Trim(), req.Subject, req.Body ?? "");
        var client = _httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://gmail.googleapis.com/gmail/v1/users/me/messages/send");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenResult.AccessToken);
        request.Content = JsonContent.Create(new GmailSendApiRequest(rawMessage));

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
        return Ok(new
        {
            message = "Email sent via Gmail API.",
            id = sendResult?.Id ?? "",
            threadId = sendResult?.ThreadId ?? "",
            scope = tokenResult.Scope,
            accessTokenExpiresIn = tokenResult.ExpiresIn,
        });
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

    public sealed record GmailSendRequest(string To, string Subject, string? Body);

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

    private static string BuildRawMessage(string to, string subject, string body)
    {
        var lines = new[]
        {
            $"To: {to}",
            $"Subject: {EncodeMimeHeader(subject)}",
            "Content-Type: text/plain; charset=utf-8",
            "MIME-Version: 1.0",
            "",
            body,
        };

        var mime = string.Join("\r\n", lines);
        var bytes = Encoding.UTF8.GetBytes(mime);
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    private static string EncodeMimeHeader(string value)
    {
        var base64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(value));
        return $"=?UTF-8?B?{base64}?=";
    }

    private sealed record GmailSendApiRequest([property: JsonPropertyName("raw")] string Raw);

    private sealed class GmailSendApiResponse
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = "";

        [JsonPropertyName("threadId")]
        public string ThreadId { get; set; } = "";
    }

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
