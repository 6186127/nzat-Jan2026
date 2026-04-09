using Microsoft.EntityFrameworkCore;
using Workshop.Api.Data;
using Workshop.Api.Models;

namespace Workshop.Api.Services;

public sealed class ReferenceDataCacheService
{
    private const string ServiceCatalogCacheKey = "ref-data:service-catalog:all:v1";
    private const string InventoryItemsCacheKey = "ref-data:inventory-items:all:v1";
    private static readonly TimeSpan ServiceCatalogCacheDuration = TimeSpan.FromMinutes(60);
    private static readonly TimeSpan InventoryItemsCacheDuration = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan CustomerServicePricesCacheDuration = TimeSpan.FromMinutes(10);

    private readonly AppDbContext _db;
    private readonly IAppCache _cache;

    public ReferenceDataCacheService(AppDbContext db, IAppCache cache)
    {
        _db = db;
        _cache = cache;
    }

    public async Task<IReadOnlyList<ServiceCatalogItem>> GetServiceCatalogItemsAsync(CancellationToken ct)
    {
        return await _cache.GetOrCreateAsync(
                ServiceCatalogCacheKey,
                ServiceCatalogCacheDuration,
                async token => await _db.ServiceCatalogItems.AsNoTracking()
                    .OrderBy(x => x.Category)
                    .ThenBy(x => x.SortOrder)
                    .ThenBy(x => x.Id)
                    .ToListAsync(token),
                ct)
            ?? [];
    }

    public async Task<Dictionary<long, ServiceCatalogItem>> GetServiceCatalogItemsByIdsAsync(
        IEnumerable<long> ids,
        CancellationToken ct)
    {
        var normalizedIds = ids.Distinct().ToHashSet();
        if (normalizedIds.Count == 0)
            return [];

        var rows = await GetServiceCatalogItemsAsync(ct);
        return rows
            .Where(x => normalizedIds.Contains(x.Id))
            .ToDictionary(x => x.Id);
    }

    public async Task<IReadOnlyList<InventoryItem>> GetInventoryItemsAsync(CancellationToken ct)
    {
        return await _cache.GetOrCreateAsync(
                InventoryItemsCacheKey,
                InventoryItemsCacheDuration,
                async token => await _db.InventoryItems.AsNoTracking()
                    .OrderBy(x => x.ItemCode)
                    .ToListAsync(token),
                ct)
            ?? [];
    }

    public async Task<Dictionary<string, InventoryItem>> GetInventoryByCodesAsync(
        IEnumerable<string> codes,
        CancellationToken ct)
    {
        var normalizedCodes = codes
            .Where(code => !string.IsNullOrWhiteSpace(code))
            .Select(code => code.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (normalizedCodes.Count == 0)
            return new Dictionary<string, InventoryItem>(StringComparer.OrdinalIgnoreCase);

        var items = await GetInventoryItemsAsync(ct);
        return items
            .Where(x => normalizedCodes.Contains(x.ItemCode))
            .GroupBy(x => x.ItemCode, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(x => x.Key, x => x.First(), StringComparer.OrdinalIgnoreCase);
    }

    public async Task<IReadOnlyList<CustomerServicePrice>> GetCustomerServicePricesAsync(long customerId, CancellationToken ct)
    {
        if (customerId <= 0)
            return [];

        return await _cache.GetOrCreateAsync(
                GetCustomerServicePricesCacheKey(customerId),
                CustomerServicePricesCacheDuration,
                async token => await _db.CustomerServicePrices.AsNoTracking()
                    .Where(x => x.CustomerId == customerId)
                    .OrderByDescending(x => x.UpdatedAt)
                    .ThenByDescending(x => x.Id)
                    .ToListAsync(token),
                ct)
            ?? [];
    }

    public Task InvalidateServiceCatalogAsync(CancellationToken ct)
        => _cache.RemoveAsync(ServiceCatalogCacheKey, ct);

    public Task InvalidateInventoryAsync(CancellationToken ct)
        => _cache.RemoveAsync(InventoryItemsCacheKey, ct);

    public Task InvalidateCustomerServicePricesAsync(long customerId, CancellationToken ct)
        => _cache.RemoveAsync(GetCustomerServicePricesCacheKey(customerId), ct);

    private static string GetCustomerServicePricesCacheKey(long customerId)
        => $"ref-data:customer-service-prices:{customerId}:v1";
}
