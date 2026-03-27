using Workshop.Api.Models;

namespace Workshop.Api.Services;

public static class JobInvoiceItemCodeResolver
{
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
        return string.IsNullOrWhiteSpace(normalizedDefaultCode) ? null : normalizedDefaultCode;
    }
}
