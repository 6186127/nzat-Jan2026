using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Workshop.Api.Data;
using Workshop.Api.Models;
using Workshop.Api.Utils;

namespace Workshop.Api.Controllers;

[ApiController]
[Route("api/worklogs")]
public class WorklogsController : ControllerBase
{
    private readonly AppDbContext _db;

    public WorklogsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] long? jobId, CancellationToken ct)
    {
        var query = from wl in _db.WorklogEntries.AsNoTracking()
            join s in _db.Staff.AsNoTracking() on wl.StaffId equals s.Id
            join j in _db.Jobs.AsNoTracking() on wl.JobId equals j.Id
            join v in _db.Vehicles.AsNoTracking() on j.VehicleId equals v.Id
            select new { wl, s, j, v };

        if (jobId.HasValue)
        {
            query = query.Where(x => x.wl.JobId == jobId.Value);
        }

        var rows = await query
            .OrderByDescending(x => x.wl.WorkDate)
            .ThenByDescending(x => x.wl.CreatedAt)
            .ToListAsync(ct);

        var data = rows.Select(x => new
        {
            id = x.wl.Id.ToString(),
            job_id = x.wl.JobId.ToString(),
            rego = x.v.Plate,
            staff_id = x.wl.StaffId.ToString(),
            staff_name = x.s.Name,
            cost_rate = x.s.CostRate,
            service_type = x.wl.ServiceType == WorklogServiceType.Mech ? "MECH" : "PNP",
            work_date = x.wl.WorkDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            start_time = x.wl.StartTime,
            end_time = x.wl.EndTime,
            admin_note = x.wl.AdminNote ?? "",
            source = x.wl.Source,
            created_at = DateTimeHelper.FormatUtc(x.wl.CreatedAt),
            updated_at = DateTimeHelper.FormatUtc(x.wl.UpdatedAt),
        });

        return Ok(data);
    }

    public record WorklogPayload(
        string? JobId,
        string? StaffId,
        string? ServiceType,
        string? WorkDate,
        string? StartTime,
        string? EndTime,
        string? AdminNote,
        string? Source
    );

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] WorklogPayload payload, CancellationToken ct)
    {
        if (payload is null) return BadRequest(new { error = "Payload is required." });
        if (!long.TryParse(payload.JobId, out var jobId))
            return BadRequest(new { error = "JobId is required." });
        if (!long.TryParse(payload.StaffId, out var staffId))
            return BadRequest(new { error = "StaffId is required." });
        if (string.IsNullOrWhiteSpace(payload.WorkDate) ||
            !DateTime.TryParseExact(payload.WorkDate, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var workDate))
            return BadRequest(new { error = "WorkDate must be yyyy-MM-dd." });
        if (string.IsNullOrWhiteSpace(payload.StartTime) || string.IsNullOrWhiteSpace(payload.EndTime))
            return BadRequest(new { error = "StartTime and EndTime are required." });

        var entity = new WorklogEntry
        {
            JobId = jobId,
            StaffId = staffId,
            ServiceType = ParseServiceType(payload.ServiceType),
            WorkDate = DateTime.SpecifyKind(workDate, DateTimeKind.Utc),
            StartTime = payload.StartTime.Trim(),
            EndTime = payload.EndTime.Trim(),
            AdminNote = payload.AdminNote?.Trim() ?? "",
            Source = string.IsNullOrWhiteSpace(payload.Source) ? "admin" : payload.Source.Trim(),
        };

        _db.WorklogEntries.Add(entity);
        await _db.SaveChangesAsync(ct);

        return Ok(new { success = true, id = entity.Id.ToString() });
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] WorklogPayload payload, CancellationToken ct)
    {
        var entity = await _db.WorklogEntries.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return NotFound(new { error = "Worklog not found." });

        if (long.TryParse(payload.JobId, out var jobId))
            entity.JobId = jobId;
        if (long.TryParse(payload.StaffId, out var staffId))
            entity.StaffId = staffId;
        if (!string.IsNullOrWhiteSpace(payload.ServiceType))
            entity.ServiceType = ParseServiceType(payload.ServiceType);
        if (!string.IsNullOrWhiteSpace(payload.WorkDate) &&
            DateTime.TryParseExact(payload.WorkDate, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var workDate))
            entity.WorkDate = DateTime.SpecifyKind(workDate, DateTimeKind.Utc);
        if (!string.IsNullOrWhiteSpace(payload.StartTime))
            entity.StartTime = payload.StartTime.Trim();
        if (!string.IsNullOrWhiteSpace(payload.EndTime))
            entity.EndTime = payload.EndTime.Trim();
        if (payload.AdminNote is not null)
            entity.AdminNote = payload.AdminNote.Trim();
        if (!string.IsNullOrWhiteSpace(payload.Source))
            entity.Source = payload.Source.Trim();

        await _db.SaveChangesAsync(ct);
        return Ok(new { success = true });
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        var entity = await _db.WorklogEntries.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return NotFound(new { error = "Worklog not found." });
        _db.WorklogEntries.Remove(entity);
        await _db.SaveChangesAsync(ct);
        return Ok(new { success = true });
    }

    private static WorklogServiceType ParseServiceType(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return WorklogServiceType.Pnp;
        var normalized = value.Trim().ToLowerInvariant();
        return normalized switch
        {
            "mech" => WorklogServiceType.Mech,
            _ => WorklogServiceType.Pnp
        };
    }
}
