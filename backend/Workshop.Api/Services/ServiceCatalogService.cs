using Microsoft.EntityFrameworkCore;
using Workshop.Api.Data;
using Workshop.Api.Models;

namespace Workshop.Api.Services;

public class ServiceCatalogService
{
    private readonly AppDbContext _db;
    private readonly ReferenceDataCacheService _referenceDataCache;

    public ServiceCatalogService(AppDbContext db, ReferenceDataCacheService referenceDataCache)
    {
        _db = db;
        _referenceDataCache = referenceDataCache;
    }

    public async Task EnsureSeededAsync(CancellationToken ct)
    {
        var existing = await _db.ServiceCatalogItems.AsNoTracking().AnyAsync(ct);
        if (existing)
            return;

        var now = DateTime.UtcNow;
        _db.ServiceCatalogItems.AddRange(
            new ServiceCatalogItem
            {
                ServiceType = "wof",
                Category = "root",
                Name = "WOF",
                PersonalLinkCode = "WOF",
                DealershipLinkCode = "WOF-DEALERSHIP",
                IsActive = true,
                SortOrder = 0,
                CreatedAt = now,
                UpdatedAt = now,
            },
            new ServiceCatalogItem
            {
                ServiceType = "mech",
                Category = "root",
                Name = "机修",
                IsActive = true,
                SortOrder = 1,
                CreatedAt = now,
                UpdatedAt = now,
            },
            new ServiceCatalogItem
            {
                ServiceType = "paint",
                Category = "root",
                Name = "喷漆",
                IsActive = true,
                SortOrder = 2,
                CreatedAt = now,
                UpdatedAt = now,
            },
            new ServiceCatalogItem
            {
                ServiceType = "mech",
                Category = "child",
                Name = "补胎",
                IsActive = true,
                SortOrder = 0,
                CreatedAt = now,
                UpdatedAt = now,
            },
            new ServiceCatalogItem
            {
                ServiceType = "mech",
                Category = "child",
                Name = "换机油",
                IsActive = true,
                SortOrder = 1,
                CreatedAt = now,
                UpdatedAt = now,
            },
            new ServiceCatalogItem
            {
                ServiceType = "mech",
                Category = "child",
                Name = "换刹车片",
                IsActive = true,
                SortOrder = 2,
                CreatedAt = now,
                UpdatedAt = now,
            },
            new ServiceCatalogItem
            {
                ServiceType = "mech",
                Category = "child",
                Name = "换电池",
                IsActive = true,
                SortOrder = 3,
                CreatedAt = now,
                UpdatedAt = now,
            },
            new ServiceCatalogItem
            {
                ServiceType = "mech",
                Category = "child",
                Name = "换滤芯",
                IsActive = true,
                SortOrder = 4,
                CreatedAt = now,
                UpdatedAt = now,
            },
            new ServiceCatalogItem
            {
                ServiceType = "mech",
                Category = "child",
                Name = "其他机修",
                IsActive = true,
                SortOrder = 5,
                CreatedAt = now,
                UpdatedAt = now,
            }
        );

        await _db.SaveChangesAsync(ct);
        await _referenceDataCache.InvalidateServiceCatalogAsync(ct);
    }
}
