using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Workshop.Api.Data;
using Workshop.Api.Models;
using Workshop.Api.Utils;

namespace Workshop.Api.Controllers;

[ApiController]
[Route("api/staff")]
public class StaffController : ControllerBase
{
    private readonly AppDbContext _db;

    public StaffController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var rows = await _db.Staff.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Name)
            .ToListAsync(ct);

        var data = rows.Select(x => new
        {
            id = x.Id.ToString(),
            name = x.Name,
            cost_rate = x.CostRate,
            createdAt = DateTimeHelper.FormatUtc(x.CreatedAt),
            updatedAt = DateTimeHelper.FormatUtc(x.UpdatedAt),
        });

        return Ok(data);
    }

    public record StaffPayload(string? Name, decimal? CostRate);

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] StaffPayload payload, CancellationToken ct)
    {
        if (payload is null || string.IsNullOrWhiteSpace(payload.Name))
            return BadRequest(new { error = "Name is required." });
        if (payload.CostRate is null || payload.CostRate <= 0)
            return BadRequest(new { error = "Cost rate must be greater than 0." });

        var entity = new Staff
        {
            Name = payload.Name.Trim(),
            CostRate = payload.CostRate.Value,
            IsActive = true,
        };

        _db.Staff.Add(entity);
        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            id = entity.Id.ToString(),
            name = entity.Name,
            cost_rate = entity.CostRate,
            createdAt = DateTimeHelper.FormatUtc(entity.CreatedAt),
            updatedAt = DateTimeHelper.FormatUtc(entity.UpdatedAt),
        });
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] StaffPayload payload, CancellationToken ct)
    {
        var entity = await _db.Staff.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return NotFound(new { error = "Staff not found." });

        if (!string.IsNullOrWhiteSpace(payload.Name))
            entity.Name = payload.Name.Trim();
        if (payload.CostRate is > 0)
            entity.CostRate = payload.CostRate.Value;

        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            id = entity.Id.ToString(),
            name = entity.Name,
            cost_rate = entity.CostRate,
            createdAt = DateTimeHelper.FormatUtc(entity.CreatedAt),
            updatedAt = DateTimeHelper.FormatUtc(entity.UpdatedAt),
        });
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        var entity = await _db.Staff.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return NotFound(new { error = "Staff not found." });
        if (!entity.IsActive) return Ok(new { success = true });

        entity.IsActive = false;
        await _db.SaveChangesAsync(ct);
        return Ok(new { success = true });
    }
}
