using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.Playwright;

namespace Workshop.Api.Services;

public sealed class NztaExpiryLookupService
{
    private const string CheckExpiryUrl = "https://transact.nzta.govt.nz/v2/check-expiry";
    private const float DefaultTimeoutMs = 25000;
    private static readonly CultureInfo NzCulture = CultureInfo.GetCultureInfo("en-NZ");
    private static readonly string[] DateFormats =
    [
        "d MMM yyyy",
        "dd MMM yyyy",
        "d MMMM yyyy",
        "dd MMMM yyyy",
        "d/M/yyyy",
        "dd/M/yyyy",
        "d/MM/yyyy",
        "dd/MM/yyyy",
        "yyyy-MM-dd",
    ];

    private static readonly Regex InspectionExpiryPattern = new(
        @"(?is)\b(?<type>wof|cof|warrant\s+of\s+fitness|certificate\s+of\s+fitness|wof/cof)\b.{0,220}?\b(?<date>\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|\d{1,2}/\d{1,2}/\d{4}|\d{4}-\d{2}-\d{2})\b",
        RegexOptions.Compiled);

    private readonly ILogger<NztaExpiryLookupService> _logger;

    public NztaExpiryLookupService(ILogger<NztaExpiryLookupService> logger)
    {
        _logger = logger;
    }

    public async Task<NztaExpiryLookupResult> LookupInspectionExpiryAsync(string plate, CancellationToken ct)
    {
        var normalizedPlate = NormalizePlate(plate);
        if (string.IsNullOrWhiteSpace(normalizedPlate))
            return NztaExpiryLookupResult.Failed("Plate is empty after normalization.");

        try
        {
            ct.ThrowIfCancellationRequested();
            using var playwright = await Playwright.CreateAsync();
            await using var browser = await playwright.Chromium.LaunchAsync(new BrowserTypeLaunchOptions
            {
                Headless = true,
                Args = ["--disable-dev-shm-usage", "--no-sandbox"],
            });

            var context = await browser.NewContextAsync(new BrowserNewContextOptions
            {
                Locale = "en-NZ",
                ViewportSize = new ViewportSize { Width = 1280, Height = 900 },
                UserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143 Safari/537.36",
            });

            var page = await context.NewPageAsync();
            page.SetDefaultTimeout(DefaultTimeoutMs);

            await page.GotoAsync(CheckExpiryUrl, new PageGotoOptions
            {
                WaitUntil = WaitUntilState.DOMContentLoaded,
                Timeout = DefaultTimeoutMs,
            });

            ct.ThrowIfCancellationRequested();
            var input = page.Locator("input:not([type=hidden])").First;
            await input.WaitForAsync(new LocatorWaitForOptions { Timeout = DefaultTimeoutMs });
            await input.FillAsync(normalizedPlate);

            await ClickContinueAsync(page);
            await WaitForResultAsync(page);

            ct.ThrowIfCancellationRequested();
            var bodyText = await page.Locator("body").InnerTextAsync(new LocatorInnerTextOptions { Timeout = DefaultTimeoutMs });
            var parsed = TryParseInspectionExpiry(bodyText);
            if (parsed is not null)
            {
                return NztaExpiryLookupResult.Found(
                    parsed.Value.ExpiryDate,
                    parsed.Value.InspectionType,
                    Truncate(bodyText, 2000));
            }

            if (bodyText.Contains("something went wrong", StringComparison.OrdinalIgnoreCase))
                return NztaExpiryLookupResult.Failed("NZTA returned a generic error page.", Truncate(bodyText, 2000));

            return NztaExpiryLookupResult.Failed("NZTA expiry result was loaded but no WOF/COF expiry date could be parsed.", Truncate(bodyText, 2000));
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "NZTA WOF/COF expiry lookup failed for plate {Plate}", normalizedPlate);
            return NztaExpiryLookupResult.Failed(ex.Message);
        }
    }

    private static async Task ClickContinueAsync(IPage page)
    {
        var continueButton = page.GetByText("Continue", new PageGetByTextOptions { Exact = true });
        if (await continueButton.CountAsync() > 0)
        {
            await continueButton.First.ClickAsync();
            return;
        }

        await page.Locator("button,input[type=submit]").First.ClickAsync();
    }

    private static async Task WaitForResultAsync(IPage page)
    {
        try
        {
            await page.WaitForLoadStateAsync(LoadState.NetworkIdle, new PageWaitForLoadStateOptions { Timeout = DefaultTimeoutMs });
        }
        catch (TimeoutException)
        {
            // The NZTA page is a Blazor app and may keep network activity open.
        }

        try
        {
            await page.WaitForFunctionAsync(
                @"() => {
                    const text = document.body?.innerText ?? '';
                    return /something went wrong/i.test(text) ||
                           /\b(WoF|CoF|WOF|COF|Warrant of Fitness|Certificate of Fitness)\b[\s\S]{0,240}?\b(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})\b/i.test(text);
                }",
                new PageWaitForFunctionOptions { Timeout = 10000 });
        }
        catch (TimeoutException)
        {
            await page.WaitForTimeoutAsync(1500);
        }
    }

    private static (DateOnly ExpiryDate, string InspectionType)? TryParseInspectionExpiry(string bodyText)
    {
        foreach (Match match in InspectionExpiryPattern.Matches(bodyText))
        {
            var dateText = match.Groups["date"].Value.Trim();
            if (!DateOnly.TryParseExact(dateText, DateFormats, NzCulture, DateTimeStyles.None, out var expiryDate))
                continue;

            var typeText = match.Groups["type"].Value;
            var inspectionType = typeText.Trim().StartsWith("cof", StringComparison.OrdinalIgnoreCase) ||
                                 typeText.Contains("certificate", StringComparison.OrdinalIgnoreCase)
                ? "COF"
                : "WOF";

            return (expiryDate, inspectionType);
        }

        return null;
    }

    private static string NormalizePlate(string plate)
        => new(plate.Trim().ToUpperInvariant().Where(char.IsLetterOrDigit).ToArray());

    private static string Truncate(string value, int maxLength)
        => value.Length <= maxLength ? value : value[..maxLength];
}

public sealed record NztaExpiryLookupResult(
    bool Success,
    DateOnly? ExpiryDate,
    string? InspectionType,
    string? Error,
    string? RawText)
{
    public static NztaExpiryLookupResult Found(DateOnly expiryDate, string inspectionType, string? rawText) =>
        new(true, expiryDate, inspectionType, null, rawText);

    public static NztaExpiryLookupResult Failed(string error, string? rawText = null) =>
        new(false, null, null, error, rawText);
}
