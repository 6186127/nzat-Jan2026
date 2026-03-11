using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using Workshop.Api.Options;

namespace Workshop.Api.Services;

public sealed class XeroTokenService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly XeroOptions _options;

    public XeroTokenService(
        IHttpClientFactory httpClientFactory,
        IOptions<XeroOptions> options)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
    }

    public async Task<XeroTokenRefreshResult> RefreshAccessTokenAsync(CancellationToken ct)
    {
        var missing = new List<string>();
        if (string.IsNullOrWhiteSpace(_options.ClientId)) missing.Add("Xero:ClientId");
        if (string.IsNullOrWhiteSpace(_options.ClientSecret)) missing.Add("Xero:ClientSecret");
        if (string.IsNullOrWhiteSpace(_options.RefreshToken)) missing.Add("Xero:RefreshToken");

        if (missing.Count > 0)
        {
            return XeroTokenRefreshResult.Fail(
                400,
                $"Missing configuration: {string.Join(", ", missing)}");
        }

        var client = _httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://identity.xero.com/connect/token");
        var basic = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_options.ClientId}:{_options.ClientSecret}"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", basic);
        request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "refresh_token",
            ["refresh_token"] = _options.RefreshToken,
        });

        using var response = await client.SendAsync(request, ct);
        var payload = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            return XeroTokenRefreshResult.Fail((int)response.StatusCode, payload);

        var token = JsonSerializer.Deserialize<RefreshTokenResponse>(payload, JsonOptions);
        if (token is null || string.IsNullOrWhiteSpace(token.AccessToken))
            return XeroTokenRefreshResult.Fail(502, "Refresh token response was empty or invalid.");

        return XeroTokenRefreshResult.Success(
            token.AccessToken,
            token.RefreshToken,
            token.ExpiresIn,
            token.Scope);
    }

    private sealed class RefreshTokenResponse
    {
        [JsonPropertyName("access_token")]
        public string AccessToken { get; set; } = "";

        [JsonPropertyName("refresh_token")]
        public string RefreshToken { get; set; } = "";

        [JsonPropertyName("expires_in")]
        public int ExpiresIn { get; set; }

        [JsonPropertyName("scope")]
        public string Scope { get; set; } = "";
    }
}

public sealed class XeroTokenRefreshResult
{
    public bool Ok { get; private init; }
    public int StatusCode { get; private init; }
    public string? Error { get; private init; }
    public string AccessToken { get; private init; } = "";
    public string RefreshToken { get; private init; } = "";
    public int ExpiresIn { get; private init; }
    public string Scope { get; private init; } = "";

    public static XeroTokenRefreshResult Fail(int statusCode, string error) =>
        new()
        {
            Ok = false,
            StatusCode = statusCode,
            Error = error,
        };

    public static XeroTokenRefreshResult Success(
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
