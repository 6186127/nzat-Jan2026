using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Workshop.Api.Options;

namespace Workshop.Api.Controllers;

[ApiController]
[Route("api/xero")]
public class XeroAuthController : ControllerBase
{
    private const string StateCachePrefix = "xero-oauth-state:";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;
    private readonly XeroOptions _options;

    public XeroAuthController(
        IHttpClientFactory httpClientFactory,
        IMemoryCache cache,
        IOptions<XeroOptions> options)
    {
        _httpClientFactory = httpClientFactory;
        _cache = cache;
        _options = options.Value;
    }

    [HttpGet("connect")]
    public IActionResult Connect([FromQuery] bool redirect = false)
    {
        var validationError = ValidateConfiguration();
        if (validationError is not null)
            return BadRequest(new { error = validationError });

        var state = Guid.NewGuid().ToString("N");
        _cache.Set(StateCachePrefix + state, true, TimeSpan.FromMinutes(15));

        var authUrl = BuildAuthorizeUrl(state);
        if (redirect)
            return Redirect(authUrl);

        return Ok(new
        {
            authorizeUrl = authUrl,
            callbackUrl = _options.RedirectUri,
            scopes = _options.Scopes.Split(' ', StringSplitOptions.RemoveEmptyEntries),
        });
    }

    [HttpGet("callback")]
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
        if (!tokenResult.ok)
            return StatusCode(tokenResult.statusCode, new { error = tokenResult.error });

        var connectionsResult = await LoadConnectionsAsync(tokenResult.accessToken!, ct);
        if (!connectionsResult.ok)
        {
            return StatusCode(connectionsResult.statusCode, new
            {
                error = connectionsResult.error,
                refreshToken = tokenResult.refreshToken,
                accessTokenExpiresIn = tokenResult.expiresIn,
            });
        }

        return Ok(new
        {
            message = "Xero authorization completed. Save the refreshToken and target tenantId into backend configuration.",
            refreshToken = tokenResult.refreshToken,
            accessTokenExpiresIn = tokenResult.expiresIn,
            scope = tokenResult.scope,
            connections = connectionsResult.connections,
            suggestedConfig = new
            {
                Xero__ClientId = _options.ClientId,
                Xero__ClientSecret = "<already configured>",
                Xero__RedirectUri = _options.RedirectUri,
                Xero__RefreshToken = tokenResult.refreshToken,
                Xero__TenantId = connectionsResult.connections?.FirstOrDefault()?.tenantId,
            },
        });
    }

    [HttpGet("health")]
    public IActionResult Health()
    {
        var missing = new List<string>();
        if (string.IsNullOrWhiteSpace(_options.ClientId)) missing.Add("Xero:ClientId");
        if (string.IsNullOrWhiteSpace(_options.ClientSecret)) missing.Add("Xero:ClientSecret");
        if (string.IsNullOrWhiteSpace(_options.RedirectUri)) missing.Add("Xero:RedirectUri");

        return Ok(new
        {
            configured = missing.Count == 0,
            missing,
            suggestedLocalCallback = "http://localhost:5227/api/xero/callback",
            currentRedirectUri = _options.RedirectUri,
            scopes = _options.Scopes.Split(' ', StringSplitOptions.RemoveEmptyEntries),
        });
    }

    private string? ValidateConfiguration()
    {
        if (string.IsNullOrWhiteSpace(_options.ClientId))
            return "Missing Xero:ClientId.";
        if (string.IsNullOrWhiteSpace(_options.ClientSecret))
            return "Missing Xero:ClientSecret.";
        if (string.IsNullOrWhiteSpace(_options.RedirectUri))
            return "Missing Xero:RedirectUri.";
        return null;
    }

    private string BuildAuthorizeUrl(string state)
    {
        var query = new Dictionary<string, string?>
        {
            ["response_type"] = "code",
            ["client_id"] = _options.ClientId,
            ["redirect_uri"] = _options.RedirectUri,
            ["scope"] = _options.Scopes,
            ["state"] = state,
        };

        var qs = string.Join("&", query.Select(kvp => $"{Uri.EscapeDataString(kvp.Key)}={Uri.EscapeDataString(kvp.Value ?? "")}"));
        return $"https://login.xero.com/identity/connect/authorize?{qs}";
    }

    private async Task<(bool ok, int statusCode, string? error, string? accessToken, string? refreshToken, int? expiresIn, string? scope)>
        ExchangeCodeForTokenAsync(string code, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://identity.xero.com/connect/token");
        var basic = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_options.ClientId}:{_options.ClientSecret}"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", basic);
        request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "authorization_code",
            ["code"] = code,
            ["redirect_uri"] = _options.RedirectUri,
        });

        using var response = await client.SendAsync(request, ct);
        var payload = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            return (false, (int)response.StatusCode, payload, null, null, null, null);

        var token = JsonSerializer.Deserialize<TokenResponse>(payload, JsonOptions);
        if (token is null || string.IsNullOrWhiteSpace(token.AccessToken))
            return (false, 502, "Token response was empty or invalid.", null, null, null, null);

        return (true, 200, null, token.AccessToken, token.RefreshToken, token.ExpiresIn, token.Scope);
    }

    private async Task<(bool ok, int statusCode, string? error, IReadOnlyList<XeroConnection>? connections)>
        LoadConnectionsAsync(string accessToken, CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, "https://api.xero.com/connections");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        using var response = await client.SendAsync(request, ct);
        var payload = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            return (false, (int)response.StatusCode, payload, null);

        var connections = JsonSerializer.Deserialize<List<XeroConnection>>(payload, JsonOptions) ?? [];
        return (true, 200, null, connections);
    }

    private sealed class TokenResponse
    {
        public string AccessToken { get; set; } = "";
        public string RefreshToken { get; set; } = "";
        public int ExpiresIn { get; set; }
        public string Scope { get; set; } = "";
    }

    public sealed class XeroConnection
    {
        public string Id { get; set; } = "";
        public string TenantId { get; set; } = "";
        public string TenantName { get; set; } = "";
        public string TenantType { get; set; } = "";
        public DateTime CreatedDateUtc { get; set; }
        public DateTime UpdatedDateUtc { get; set; }

        public string tenantId => TenantId;
        public string tenantName => TenantName;
        public string tenantType => TenantType;
    }
}
