using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using Workshop.Api.Options;

namespace Workshop.Api.Services;

public sealed class GmailTokenService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly GmailOptions _options;

    public GmailTokenService(
        IHttpClientFactory httpClientFactory,
        IOptions<GmailOptions> options)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
    }

    public async Task<GmailTokenRefreshResult> RefreshAccessTokenAsync(CancellationToken ct)
    {
        var missing = new List<string>();
        if (string.IsNullOrWhiteSpace(_options.ClientId)) missing.Add("Gmail:ClientId");
        if (string.IsNullOrWhiteSpace(_options.ClientSecret)) missing.Add("Gmail:ClientSecret");
        if (string.IsNullOrWhiteSpace(_options.RefreshToken)) missing.Add("Gmail:RefreshToken");

        if (missing.Count > 0)
        {
            return GmailTokenRefreshResult.Fail(
                400,
                $"Missing configuration: {string.Join(", ", missing)}");
        }

        var client = _httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://oauth2.googleapis.com/token");
        request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_id"] = _options.ClientId,
            ["client_secret"] = _options.ClientSecret,
            ["refresh_token"] = _options.RefreshToken,
            ["grant_type"] = "refresh_token",
        });

        using var response = await client.SendAsync(request, ct);
        var payload = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            return GmailTokenRefreshResult.Fail((int)response.StatusCode, payload);

        var token = JsonSerializer.Deserialize<RefreshTokenResponse>(payload, JsonOptions);
        if (token is null || string.IsNullOrWhiteSpace(token.AccessToken))
            return GmailTokenRefreshResult.Fail(502, "Refresh token response was empty or invalid.");

        return GmailTokenRefreshResult.Success(
            token.AccessToken,
            token.ExpiresIn,
            token.Scope ?? "");
    }

    private sealed class RefreshTokenResponse
    {
        [JsonPropertyName("access_token")]
        public string AccessToken { get; set; } = "";

        [JsonPropertyName("expires_in")]
        public int ExpiresIn { get; set; }

        [JsonPropertyName("scope")]
        public string? Scope { get; set; }
    }
}

public sealed class GmailTokenRefreshResult
{
    public bool Ok { get; private init; }
    public int StatusCode { get; private init; }
    public string? Error { get; private init; }
    public string AccessToken { get; private init; } = "";
    public int ExpiresIn { get; private init; }
    public string Scope { get; private init; } = "";

    public static GmailTokenRefreshResult Fail(int statusCode, string error) =>
        new()
        {
            Ok = false,
            StatusCode = statusCode,
            Error = error,
        };

    public static GmailTokenRefreshResult Success(
        string accessToken,
        int expiresIn,
        string scope) =>
        new()
        {
            Ok = true,
            StatusCode = 200,
            AccessToken = accessToken,
            ExpiresIn = expiresIn,
            Scope = scope,
        };
}
