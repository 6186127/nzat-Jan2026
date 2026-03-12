using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Workshop.Api.Data;
using Workshop.Api.Models;

namespace Workshop.Api.Controllers;

[ApiController]
[Route("api/customers")]
public class CustomersController : ControllerBase
{
    private readonly AppDbContext _db;

    public CustomersController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var customers = await _db.Customers.AsNoTracking()
            .OrderBy(x => x.Name)
            .ToListAsync(ct);

        var customerIds = customers.Select(x => x.Id).ToArray();
        var staffRows = await _db.CustomerStaffMembers.AsNoTracking()
            .Where(x => customerIds.Contains(x.CustomerId))
            .OrderBy(x => x.Id)
            .ToListAsync(ct);

        var staffByCustomerId = staffRows
            .GroupBy(x => x.CustomerId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(ToStaffResponse).ToList()
            );

        var rows = customers.Select(x => ToCustomerResponse(
            x,
            staffByCustomerId.TryGetValue(x.Id, out var members) ? members : []
        ));

        return Ok(rows);
    }

    public record CustomerStaffUpsertRequest(
        string? Name,
        string? Title,
        string? Email
    );

    public record CustomerUpsertRequest(
        string Type,
        string Name,
        string? Phone,
        string? Email,
        string? Address,
        string? BusinessCode,
        string? Notes,
        List<CustomerStaffUpsertRequest>? StaffMembers
    );

    public record CustomerStaffResponse(
        string Name,
        string Title,
        string Email
    );

    public record CustomerResponse(
        string Id,
        string Type,
        string Name,
        string Phone,
        string Email,
        string Address,
        string BusinessCode,
        string Notes,
        List<CustomerStaffResponse> StaffMembers
    );

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
        try
        {
            staffMembers = NormalizeStaffMembers(normalizedType, req.StaffMembers);
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
            StaffMembers = staffMembers
        };

        _db.Customers.Add(customer);
        await _db.SaveChangesAsync(ct);

        return Ok(ToCustomerResponse(customer, customer.StaffMembers.Select(ToStaffResponse).ToList()));
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
        try
        {
            staffMembers = NormalizeStaffMembers(normalizedType, req.StaffMembers);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }

        var customer = await _db.Customers
            .Include(x => x.StaffMembers)
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
        customer.StaffMembers = staffMembers;

        await _db.SaveChangesAsync(ct);

        return Ok(ToCustomerResponse(customer, customer.StaffMembers.Select(ToStaffResponse).ToList()));
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
        return Ok(new { success = true });
    }

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

            // Skip fully blank rows so UI can keep an empty draft row safely.
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

    private static CustomerStaffResponse ToStaffResponse(CustomerStaff row) => new(
        row.Name,
        row.Title ?? "",
        row.Email ?? ""
    );

    private static CustomerResponse ToCustomerResponse(Customer row, List<CustomerStaffResponse> staffMembers) => new(
        row.Id.ToString(CultureInfo.InvariantCulture),
        row.Type,
        row.Name,
        row.Phone ?? "",
        row.Email ?? "",
        row.Address ?? "",
        row.BusinessCode ?? "",
        row.Notes ?? "",
        staffMembers
    );
}
