using Workshop.Api.Models;

namespace Workshop.Api.Services;

public static class JobInvoiceItemCodeResolver
{
    private const string MechRootFallbackCode = "203-Services";
    private const string PaintRootFallbackCode = "206-PNP-L";

    public static string? Resolve(
        Customer customer,
        ServiceCatalogItem catalogItem,
        string? overrideCode)
    {
        var normalizedOverrideCode = overrideCode?.Trim();
        if (!string.IsNullOrWhiteSpace(normalizedOverrideCode))
            return normalizedOverrideCode;

        var defaultCode = string.Equals(customer.Type, "Personal", StringComparison.OrdinalIgnoreCase)
            ? catalogItem.PersonalLinkCode
            : catalogItem.DealershipLinkCode;

        var normalizedDefaultCode = defaultCode?.Trim();
        if (!string.IsNullOrWhiteSpace(normalizedDefaultCode))
            return normalizedDefaultCode;

        return ResolveRootFallbackCode(catalogItem);
    }

    private static string? ResolveRootFallbackCode(ServiceCatalogItem catalogItem)
    {
        if (!string.Equals(catalogItem.Category, "root", StringComparison.OrdinalIgnoreCase))
            return null;

        return catalogItem.ServiceType.Trim().ToLowerInvariant() switch
        {
            "mech" => MechRootFallbackCode,
            "paint" => PaintRootFallbackCode,
            _ => null,
        };
    }
}
