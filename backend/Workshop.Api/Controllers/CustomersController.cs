using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Workshop.Api.Data;
using Workshop.Api.Models;
using Workshop.Api.Services;

namespace Workshop.Api.Controllers;

[ApiController]
[Route("api/customers")]
public class CustomersController : ControllerBase
{
    private const string CustomerListCacheKey = "customer:list:v1";
    private static readonly TimeSpan CustomerListCacheDuration = TimeSpan.FromMinutes(60);
    private static readonly TimeSpan CustomerProfileCacheDuration = TimeSpan.FromMinutes(60);

    private readonly AppDbContext _db;
    private readonly IAppCache _cache;

    public CustomersController(AppDbContext db, IAppCache cache)
    {
        _db = db;
        _cache = cache;
    }

    public record CustomerStaffUpsertRequest(
        string? Name,
        string? Title,
        string? Email
    );

    public record CustomerServicePriceUpsertRequest(
        long? Id,
        long? ServiceCatalogItemId,
        string? XeroItemCode,
        bool IsActive
    );

    public record CustomerUpsertRequest(
        string Type,
        string Name,
        string? Phone,
        string? Email,
        string? Address,
        string? BusinessCode,
        string? Notes,
        List<CustomerStaffUpsertRequest>? StaffMembers,
        List<CustomerServicePriceUpsertRequest>? ServicePrices
    );

    public record CustomerStaffResponse(
        string Name,
        string Title,
        string Email
    );

    public record CustomerServicePriceResponse(
        string Id,
        string ServiceCatalogItemId,
        string ServiceName,
        string XeroItemCode,
        decimal? SalePrice,
        bool IsActive
    );

    public record CustomerListResponse(
        string Id,
        string Type,
        string Name,
        string Phone,
        string Email,
        string Address,
        string BusinessCode,
        string Notes,
        int ServicePriceCount,
        int CurrentYearJobCount,
        List<CustomerStaffResponse> StaffMembers
    );

    public record CustomerJobResponse(
        string Id,
        string VehicleStatus,
        bool Urgent,
        bool NeedsPo,
        string[] SelectedTags,
        string Plate,
        string VehicleModel,
        int? WofPct,
        int? MechPct,
        int? PaintPct,
        string CustomerName,
        string CustomerCode,
        string CustomerPhone,
        string Notes,
        string? ExternalInvoiceId,
        string CreatedAt
    );

    public record CustomerProfileResponse(
        string Id,
        string Type,
        string Name,
        string Phone,
        string Email,
        string Address,
        string BusinessCode,
        string Notes,
        List<CustomerStaffResponse> StaffMembers,
        List<CustomerServicePriceResponse> ServicePrices,
        int CurrentYearJobCount,
        List<CustomerJobResponse> Jobs
    );

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var rows = await _cache.GetOrCreateAsync(
            CustomerListCacheKey,
            CustomerListCacheDuration,
            async token => await LoadCustomerListAsync(token),
            ct
        ) ?? [];

        return Ok(rows);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id, CancellationToken ct)
    {
        var profile = await _cache.GetOrCreateAsync(
            GetCustomerProfileCacheKey(id),
            CustomerProfileCacheDuration,
            token => LoadCustomerProfileAsync(id, token),
            ct
        );

        if (profile is null)
            return NotFound(new { error = "Customer not found." });

        return Ok(profile);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CustomerUpsertRequest req, CancellationToken ct)
    {
        if (req is null || string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { error = "Name is required." });
        if (string.IsNullOrWhiteSpace(req.Type))
            return BadRequest(new { error = "Type is required." });

        var normalizedType = NormalizeCustomerType(req.Type);
        if (!IsValidCustomerType(normalizedType))
            return BadRequest(new { error = "Customer type must be Personal or Business." });

        List<CustomerStaff> staffMembers;
        List<CustomerServicePrice> servicePrices;
        try
        {
            staffMembers = NormalizeStaffMembers(normalizedType, req.StaffMembers);
            servicePrices = await NormalizeServicePrices(req.ServicePrices, ct);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        var customer = new Customer
        {
            Type = normalizedType,
            Name = req.Name.Trim(),
            Phone = req.Phone?.Trim(),
            Email = req.Email?.Trim(),
            Address = req.Address?.Trim(),
            BusinessCode = req.BusinessCode?.Trim(),
            Notes = req.Notes?.Trim(),
            StaffMembers = staffMembers,
            ServicePrices = servicePrices
        };

        _db.Customers.Add(customer);
        await _db.SaveChangesAsync(ct);
        await InvalidateCustomerCachesAsync(customer.Id, ct);

        return await GetById(customer.Id, ct);
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] CustomerUpsertRequest req, CancellationToken ct)
    {
        if (req is null || string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { error = "Name is required." });
        if (string.IsNullOrWhiteSpace(req.Type))
            return BadRequest(new { error = "Type is required." });

        var normalizedType = NormalizeCustomerType(req.Type);
        if (!IsValidCustomerType(normalizedType))
            return BadRequest(new { error = "Customer type must be Personal or Business." });

        List<CustomerStaff> staffMembers;
        List<CustomerServicePrice> servicePrices;
        try
        {
            staffMembers = NormalizeStaffMembers(normalizedType, req.StaffMembers);
            servicePrices = await NormalizeServicePrices(req.ServicePrices, ct);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        var customer = await _db.Customers
            .Include(x => x.StaffMembers)
            .Include(x => x.ServicePrices)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        if (customer is null)
            return NotFound(new { error = "Customer not found." });

        customer.Type = normalizedType;
        customer.Name = req.Name.Trim();
        customer.Phone = req.Phone?.Trim();
        customer.Email = req.Email?.Trim();
        customer.Address = req.Address?.Trim();
        customer.BusinessCode = req.BusinessCode?.Trim();
        customer.Notes = req.Notes?.Trim();

        _db.CustomerStaffMembers.RemoveRange(customer.StaffMembers);
        _db.CustomerServicePrices.RemoveRange(customer.ServicePrices);
        customer.StaffMembers = staffMembers;
        customer.ServicePrices = servicePrices;

        await _db.SaveChangesAsync(ct);
        await InvalidateCustomerCachesAsync(id, ct);

        return await GetById(id, ct);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        var customer = await _db.Customers.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (customer is null)
            return NotFound(new { error = "Customer not found." });

        var inUse = await _db.Jobs.AsNoTracking().AnyAsync(x => x.CustomerId == id, ct);
        if (inUse)
            return BadRequest(new { error = "Customer is used by jobs and cannot be deleted." });

        _db.Customers.Remove(customer);
        await _db.SaveChangesAsync(ct);
        await InvalidateCustomerCachesAsync(id, ct);
        return Ok(new { success = true });
    }

    private async Task<List<CustomerListResponse>> LoadCustomerListAsync(CancellationToken ct)
    {
        var customers = await _db.Customers.AsNoTracking()
            .OrderBy(x => x.Name)
            .ToListAsync(ct);

        var customerIds = customers.Select(x => x.Id).ToArray();
        var staffRows = await _db.CustomerStaffMembers.AsNoTracking()
            .Where(x => customerIds.Contains(x.CustomerId))
            .OrderBy(x => x.Id)
            .ToListAsync(ct);
        Dictionary<long, int> servicePriceCounts;
        try
        {
            servicePriceCounts = await _db.CustomerServicePrices.AsNoTracking()
                .Where(x => customerIds.Contains(x.CustomerId))
                .GroupBy(x => x.CustomerId)
                .Select(g => new { CustomerId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.CustomerId, x => x.Count, ct);
        }
        catch (PostgresException ex) when (ex.SqlState == "42P01")
        {
            servicePriceCounts = [];
        }
        var yearStart = new DateTime(DateTime.UtcNow.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var nextYearStart = yearStart.AddYears(1);
        var currentYearJobCounts = await _db.Jobs.AsNoTracking()
            .Where(x => x.CustomerId.HasValue && customerIds.Contains(x.CustomerId.Value))
            .Where(x => x.CreatedAt >= yearStart && x.CreatedAt < nextYearStart)
            .GroupBy(x => x.CustomerId!.Value)
            .Select(g => new { CustomerId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.CustomerId, x => x.Count, ct);

        var staffByCustomerId = staffRows
            .GroupBy(x => x.CustomerId)
            .ToDictionary(g => g.Key, g => g.Select(ToStaffResponse).ToList());

        var rows = customers.Select(x => ToCustomerListResponse(
            x,
            staffByCustomerId.TryGetValue(x.Id, out var members) ? members : [],
            servicePriceCounts.TryGetValue(x.Id, out var servicePriceCount) ? servicePriceCount : 0,
            currentYearJobCounts.TryGetValue(x.Id, out var currentYearJobCount) ? currentYearJobCount : 0
        )).ToList();

        return rows;
    }

    private async Task<CustomerProfileResponse?> LoadCustomerProfileAsync(long id, CancellationToken ct)
    {
        var customerRows = await (
                from customerRow in _db.Customers.AsNoTracking()
                where customerRow.Id == id
                join staff in _db.CustomerStaffMembers.AsNoTracking() on customerRow.Id equals staff.CustomerId into staffGroup
                from staff in staffGroup.DefaultIfEmpty()
                orderby staff != null ? staff.Id : 0
                select new
                {
                    Customer = customerRow,
                    StaffMember = staff
                }
            )
            .ToListAsync(ct);

        if (customerRows.Count == 0)
            return null;

        var customer = customerRows[0].Customer;
        var staffMembers = customerRows
            .Where(x => x.StaffMember is not null)
            .Select(x => ToStaffResponse(x.StaffMember!))
            .ToList();

        List<CustomerServicePriceResponse> servicePrices;
        try
        {
            servicePrices = await (
                    from price in _db.CustomerServicePrices.AsNoTracking()
                    where price.CustomerId == id
                    join service in _db.ServiceCatalogItems.AsNoTracking()
                        on price.ServiceCatalogItemId equals service.Id into serviceGroup
                    from service in serviceGroup.DefaultIfEmpty()
                    join inventory in _db.InventoryItems.AsNoTracking()
                        on price.XeroItemCode equals inventory.ItemCode into inventoryGroup
                    from inventory in inventoryGroup.DefaultIfEmpty()
                    orderby price.Id
                    select new CustomerServicePriceResponse(
                        price.Id.ToString(CultureInfo.InvariantCulture),
                        price.ServiceCatalogItemId.ToString(CultureInfo.InvariantCulture),
                        service != null ? service.Name : "",
                        price.XeroItemCode,
                        inventory != null ? inventory.SalesUnitPrice : null,
                        price.IsActive
                    )
                )
                .ToListAsync(ct);
        }
        catch (PostgresException ex) when (ex.SqlState == "42P01")
        {
            servicePrices = [];
        }

        var yearStart = new DateTime(DateTime.UtcNow.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var nextYearStart = yearStart.AddYears(1);
        var jobs = await (
                from j in _db.Jobs.AsNoTracking()
                join v in _db.Vehicles.AsNoTracking() on j.VehicleId equals v.Id
                join ji in _db.JobInvoices.AsNoTracking() on j.Id equals ji.JobId into invoiceGroup
                from ji in invoiceGroup.DefaultIfEmpty()
                where j.CustomerId == id && j.CreatedAt >= yearStart && j.CreatedAt < nextYearStart
                orderby j.CreatedAt descending
                select new CustomerJobResponse(
                    j.Id.ToString(CultureInfo.InvariantCulture),
                    MapStatus(j.Status),
                    j.IsUrgent,
                    j.NeedsPo,
                    j.IsUrgent ? new[] { "Urgent" } : Array.Empty<string>(),
                    v.Plate,
                    BuildVehicleModel(v.Make, v.Model, v.Year),
                    null,
                    null,
                    null,
                    customer.Name,
                    customer.BusinessCode ?? "",
                    customer.Phone ?? "",
                    j.Notes ?? "",
                    ji != null ? ji.ExternalInvoiceId : null,
                    FormatDateTime(j.CreatedAt)
                )
            )
            .ToListAsync(ct);

        return ToCustomerProfileResponse(customer, staffMembers, servicePrices, jobs.Count, jobs);
    }

    private async Task InvalidateCustomerCachesAsync(long customerId, CancellationToken ct)
    {
        await _cache.RemoveAsync(CustomerListCacheKey, ct);
        await _cache.RemoveAsync(GetCustomerProfileCacheKey(customerId), ct);
    }

    private static string GetCustomerProfileCacheKey(long customerId)
        => $"customer:profile:{customerId}:v1";

    private static string NormalizeCustomerType(string? type)
    {
        var trimmed = type?.Trim() ?? "";
        if (string.Equals(trimmed, "personal", StringComparison.OrdinalIgnoreCase))
            return "Personal";
        if (string.Equals(trimmed, "business", StringComparison.OrdinalIgnoreCase))
            return "Business";
        return trimmed;
    }

    private static bool IsValidCustomerType(string type)
        => string.Equals(type, "Personal", StringComparison.Ordinal) ||
           string.Equals(type, "Business", StringComparison.Ordinal);

    private static List<CustomerStaff> NormalizeStaffMembers(
        string customerType,
        List<CustomerStaffUpsertRequest>? rows
    )
    {
        if (!string.Equals(customerType, "Business", StringComparison.Ordinal))
            return [];
        if (rows is null || rows.Count == 0)
            return [];

        var members = new List<CustomerStaff>();
        foreach (var row in rows)
        {
            var name = row.Name?.Trim() ?? "";
            var title = row.Title?.Trim() ?? "";
            var email = row.Email?.Trim() ?? "";

            if (string.IsNullOrWhiteSpace(name) &&
                string.IsNullOrWhiteSpace(title) &&
                string.IsNullOrWhiteSpace(email))
                continue;

            if (string.IsNullOrWhiteSpace(name))
                throw new InvalidOperationException("Staff member name is required.");

            members.Add(new CustomerStaff
            {
                Name = name,
                Title = title,
                Email = email
            });
        }

        return members;
    }

    private async Task<List<CustomerServicePrice>> NormalizeServicePrices(
        List<CustomerServicePriceUpsertRequest>? rows,
        CancellationToken ct
    )
    {
        if (rows is null || rows.Count == 0)
            return [];

        var cleaned = rows
            .Where(x =>
                (x.ServiceCatalogItemId ?? 0) > 0 ||
                !string.IsNullOrWhiteSpace(x.XeroItemCode))
            .ToList();

        if (cleaned.Count == 0)
            return [];

        var serviceIds = cleaned
            .Select(x => x.ServiceCatalogItemId ?? 0)
            .Where(x => x > 0)
            .Distinct()
            .ToArray();

        var validServiceIds = await _db.ServiceCatalogItems.AsNoTracking()
            .Where(x => serviceIds.Contains(x.Id))
            .Select(x => x.Id)
            .ToListAsync(ct);

        var validServiceIdSet = validServiceIds.ToHashSet();
        var itemCodes = cleaned
            .Select(x => (x.XeroItemCode ?? "").Trim())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
        var validItemCodes = await _db.InventoryItems.AsNoTracking()
            .Where(x => itemCodes.Contains(x.ItemCode))
            .Select(x => x.ItemCode)
            .ToListAsync(ct);
        var validItemCodeSet = validItemCodes.ToHashSet(StringComparer.OrdinalIgnoreCase);

        var normalized = new List<CustomerServicePrice>();
        foreach (var row in cleaned)
        {
            var serviceCatalogItemId = row.ServiceCatalogItemId ?? 0;
            var xeroItemCode = row.XeroItemCode?.Trim() ?? "";

            if (serviceCatalogItemId <= 0)
                throw new InvalidOperationException("Service is required.");
            if (!validServiceIdSet.Contains(serviceCatalogItemId))
                throw new InvalidOperationException($"Service '{serviceCatalogItemId}' is invalid.");
            if (string.IsNullOrWhiteSpace(xeroItemCode))
                throw new InvalidOperationException("Xero item code is required.");
            if (!validItemCodeSet.Contains(xeroItemCode))
                throw new InvalidOperationException($"Xero item code '{xeroItemCode}' is invalid.");

            normalized.Add(new CustomerServicePrice
            {
                ServiceCatalogItemId = serviceCatalogItemId,
                XeroItemCode = xeroItemCode,
                IsActive = row.IsActive,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
        }

        return normalized;
    }

    private static CustomerStaffResponse ToStaffResponse(CustomerStaff row) => new(
        row.Name,
        row.Title ?? "",
        row.Email ?? ""
    );

    private static CustomerServicePriceResponse ToServicePriceResponse(
        CustomerServicePrice row,
        string serviceName,
        decimal? salePrice
    ) => new(
        row.Id.ToString(CultureInfo.InvariantCulture),
        row.ServiceCatalogItemId.ToString(CultureInfo.InvariantCulture),
        serviceName,
        row.XeroItemCode,
        salePrice,
        row.IsActive
    );

    private static CustomerListResponse ToCustomerListResponse(
        Customer row,
        List<CustomerStaffResponse> staffMembers,
        int servicePriceCount,
        int currentYearJobCount
    ) => new(
        row.Id.ToString(CultureInfo.InvariantCulture),
        row.Type,
        row.Name,
        row.Phone ?? "",
        row.Email ?? "",
        row.Address ?? "",
        row.BusinessCode ?? "",
        row.Notes ?? "",
        servicePriceCount,
        currentYearJobCount,
        staffMembers
    );

    private static CustomerProfileResponse ToCustomerProfileResponse(
        Customer row,
        List<CustomerStaffResponse> staffMembers,
        List<CustomerServicePriceResponse> servicePrices,
        int currentYearJobCount,
        List<CustomerJobResponse> jobs
    ) => new(
        row.Id.ToString(CultureInfo.InvariantCulture),
        row.Type,
        row.Name,
        row.Phone ?? "",
        row.Email ?? "",
        row.Address ?? "",
        row.BusinessCode ?? "",
        row.Notes ?? "",
        staffMembers,
        servicePrices,
        currentYearJobCount,
        jobs
    );

    private static string MapStatus(string? status)
    {
        var value = status?.Trim() ?? "";
        if (value.Equals("InProgress", StringComparison.OrdinalIgnoreCase))
            return "In Progress";
        if (value.Equals("Delivered", StringComparison.OrdinalIgnoreCase))
            return "Ready";
        if (value.Equals("Completed", StringComparison.OrdinalIgnoreCase))
            return "Completed";
        if (value.Equals("Archived", StringComparison.OrdinalIgnoreCase))
            return "Archived";
        if (value.Equals("Cancelled", StringComparison.OrdinalIgnoreCase))
            return "Cancelled";
        if (value.Equals("In Progress", StringComparison.OrdinalIgnoreCase))
            return "In Progress";
        return value;
    }

    private static string BuildVehicleModel(string? make, string? model, int? year)
    {
        var parts = new List<string>();
        if (year.HasValue) parts.Add(year.Value.ToString(CultureInfo.InvariantCulture));
        if (!string.IsNullOrWhiteSpace(make)) parts.Add(make.Trim());
        if (!string.IsNullOrWhiteSpace(model)) parts.Add(model.Trim());
        return parts.Count == 0 ? "" : string.Join(" ", parts);
    }

    private static string FormatDateTime(DateTime value)
    {
        var utc = value.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(value, DateTimeKind.Utc)
            : value.ToUniversalTime();
        return utc.ToString("O", CultureInfo.InvariantCulture);
    }
}
