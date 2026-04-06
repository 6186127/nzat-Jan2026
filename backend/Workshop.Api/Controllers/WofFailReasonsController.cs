using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Workshop.Api.Data;
using Workshop.Api.Models;
using Workshop.Api.Services;
using Workshop.Api.Utils;

namespace Workshop.Api.Controllers;

[ApiController]
[Route("api/wof-fail-reasons")]
public class WofFailReasonsController : ControllerBase
{
    private const string WofFailReasonsCacheKey = "dict:wof-fail-reasons:v1";
    private static readonly TimeSpan WofFailReasonsCacheDuration = TimeSpan.FromMinutes(60);

    private readonly AppDbContext _db;
    private readonly IAppCache _cache;

    public WofFailReasonsController(AppDbContext db, IAppCache cache)
    {
        _db = db;
        _cache = cache;
    }

    public record WofFailReasonResponse(
        string Id,
        string? Code,
        string Label,
        bool IsActive,
        string CreatedAt,
        string UpdatedAt
    );

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var reasons = await _cache.GetOrCreateAsync(
            WofFailReasonsCacheKey,
            WofFailReasonsCacheDuration,
            async token => await _db.WofFailReasons.AsNoTracking()
                .OrderBy(x => x.Label)
                .Select(x => new WofFailReasonResponse(
                    x.Id.ToString(CultureInfo.InvariantCulture),
                    x.Code,
                    x.Label,
                    x.IsActive,
                    DateTimeHelper.FormatUtc(x.CreatedAt),
                    DateTimeHelper.FormatUtc(x.UpdatedAt)
                ))
                .ToListAsync(token),
            ct
        ) ?? [];

        return Ok(reasons);
    }

    public record WofFailReasonUpsertRequest(string Label, string? Code, bool IsActive);

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] WofFailReasonUpsertRequest req, CancellationToken ct)
    {
        if (req is null || string.IsNullOrWhiteSpace(req.Label))
            return BadRequest(new { error = "Label is required." });

        var label = req.Label.Trim();
        var exists = await _db.WofFailReasons.AsNoTracking().AnyAsync(x => x.Label == label, ct);
        if (exists)
            return Conflict(new { error = "Fail reason already exists." });

        var reason = new WofFailReason
        {
            Code = NormalizeCode(req.Code),
            Label = label,
            IsActive = req.IsActive,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.WofFailReasons.Add(reason);
        await _db.SaveChangesAsync(ct);
        await _cache.RemoveAsync(WofFailReasonsCacheKey, ct);

        return Ok(new WofFailReasonResponse(
            reason.Id.ToString(CultureInfo.InvariantCulture),
            reason.Code,
            reason.Label,
            reason.IsActive,
            DateTimeHelper.FormatUtc(reason.CreatedAt),
            DateTimeHelper.FormatUtc(reason.UpdatedAt)
        ));
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] WofFailReasonUpsertRequest req, CancellationToken ct)
    {
        if (req is null || string.IsNullOrWhiteSpace(req.Label))
            return BadRequest(new { error = "Label is required." });

        var reason = await _db.WofFailReasons.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (reason is null)
            return NotFound(new { error = "Fail reason not found." });

        var label = req.Label.Trim();
        var exists = await _db.WofFailReasons.AsNoTracking()
            .AnyAsync(x => x.Label == label && x.Id != id, ct);
        if (exists)
            return Conflict(new { error = "Fail reason already exists." });

        reason.Code = NormalizeCode(req.Code);
        reason.Label = label;
        reason.IsActive = req.IsActive;
        reason.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        await _cache.RemoveAsync(WofFailReasonsCacheKey, ct);

        return Ok(new WofFailReasonResponse(
            reason.Id.ToString(CultureInfo.InvariantCulture),
            reason.Code,
            reason.Label,
            reason.IsActive,
            DateTimeHelper.FormatUtc(reason.CreatedAt),
            DateTimeHelper.FormatUtc(reason.UpdatedAt)
        ));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        var reason = await _db.WofFailReasons.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (reason is null)
            return NotFound(new { error = "Fail reason not found." });

        _db.WofFailReasons.Remove(reason);
        await _db.SaveChangesAsync(ct);
        await _cache.RemoveAsync(WofFailReasonsCacheKey, ct);
        return Ok(new { success = true });
    }

    private static string? NormalizeCode(string? code)
    {
        if (string.IsNullOrWhiteSpace(code))
            return null;

        return code.Trim();
    }
}
