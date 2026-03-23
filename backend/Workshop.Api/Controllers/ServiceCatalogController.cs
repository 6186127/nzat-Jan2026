using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Workshop.Api.Data;
using Workshop.Api.Models;
using Workshop.Api.Services;

namespace Workshop.Api.Controllers;

[ApiController]
[Route("api/service-catalog")]
public class ServiceCatalogController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ServiceCatalogService _serviceCatalogService;

    public ServiceCatalogController(AppDbContext db, ServiceCatalogService serviceCatalogService)
    {
        _db = db;
        _serviceCatalogService = serviceCatalogService;
    }

    public sealed record ServiceCatalogUpsertRequest(
        string ServiceType,
        string Category,
        string Name,
        string? PersonalLinkCode,
        string? DealershipLinkCode,
        bool IsActive,
        int? SortOrder
    );

    [HttpGet]
    public async Task<IActionResult> GetCatalog(CancellationToken ct)
    {
        await _serviceCatalogService.EnsureSeededAsync(ct);

        var rows = await _db.ServiceCatalogItems.AsNoTracking()
            .OrderBy(x => x.Category)
            .ThenBy(x => x.SortOrder)
            .ThenBy(x => x.Id)
            .ToListAsync(ct);

        return Ok(new
        {
            rootServices = rows.Where(x => x.Category == "root").Select(ToResponse).ToList(),
            childServices = rows.Where(x => x.Category == "child").Select(ToResponse).ToList(),
        });
    }

    [HttpGet("manage")]
    public Task<IActionResult> GetManage(CancellationToken ct) => GetCatalog(ct);

    [HttpPost("manage")]
    public async Task<IActionResult> Create([FromBody] ServiceCatalogUpsertRequest req, CancellationToken ct)
    {
        await _serviceCatalogService.EnsureSeededAsync(ct);

        var category = Normalize(req.Category);
        var serviceType = Normalize(req.ServiceType);
        if (!IsValidCategory(category) || !IsValidServiceType(serviceType))
            return BadRequest(new { error = "Invalid service type or category." });
        if (category != "child")
            return BadRequest(new { error = "Only child services can be created." });
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { error = "Name is required." });

        var row = new ServiceCatalogItem
        {
            ServiceType = serviceType,
            Category = category,
            Name = req.Name.Trim(),
            PersonalLinkCode = NullIfBlank(req.PersonalLinkCode),
            DealershipLinkCode = NullIfBlank(req.DealershipLinkCode),
            IsActive = req.IsActive,
            SortOrder = req.SortOrder ?? 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.ServiceCatalogItems.Add(row);
        await _db.SaveChangesAsync(ct);
        return Ok(ToResponse(row));
    }

    [HttpPut("manage/{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] ServiceCatalogUpsertRequest req, CancellationToken ct)
    {
        await _serviceCatalogService.EnsureSeededAsync(ct);

        var row = await _db.ServiceCatalogItems.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (row is null)
            return NotFound(new { error = "Service config not found." });
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { error = "Name is required." });

        var serviceType = Normalize(req.ServiceType);
        var category = Normalize(req.Category);
        if (!IsValidCategory(category) || !IsValidServiceType(serviceType))
            return BadRequest(new { error = "Invalid service type or category." });
        if (row.Category == "root" && category != "root")
            return BadRequest(new { error = "Root services cannot be converted to child services." });

        row.ServiceType = serviceType;
        row.Category = row.Category == "root" ? "root" : category;
        row.Name = req.Name.Trim();
        row.PersonalLinkCode = NullIfBlank(req.PersonalLinkCode);
        row.DealershipLinkCode = NullIfBlank(req.DealershipLinkCode);
        row.IsActive = req.IsActive;
        row.SortOrder = req.SortOrder ?? row.SortOrder;
        row.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return Ok(ToResponse(row));
    }

    [HttpDelete("manage/{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        await _serviceCatalogService.EnsureSeededAsync(ct);

        var row = await _db.ServiceCatalogItems.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (row is null)
            return NotFound(new { error = "Service config not found." });
        if (row.Category != "child")
            return BadRequest(new { error = "Only child services can be deleted." });

        _db.ServiceCatalogItems.Remove(row);
        await _db.SaveChangesAsync(ct);
        return Ok(new { success = true });
    }

    private static object ToResponse(ServiceCatalogItem row) => new
    {
        id = row.Id,
        serviceType = row.ServiceType,
        category = row.Category,
        name = row.Name,
        personalLinkCode = row.PersonalLinkCode,
        dealershipLinkCode = row.DealershipLinkCode,
        isActive = row.IsActive,
        sortOrder = row.SortOrder,
        createdAt = row.CreatedAt,
        updatedAt = row.UpdatedAt,
    };

    private static string Normalize(string? value) => (value ?? "").Trim().ToLowerInvariant();
    private static bool IsValidServiceType(string value) => value is "wof" or "mech" or "paint";
    private static bool IsValidCategory(string value) => value is "root" or "child";
    private static string? NullIfBlank(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }
}
