using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Workshop.Api.Data;
using Workshop.Api.Models;
using Workshop.Api.Services;
using Workshop.Api.Utils;

namespace Workshop.Api.Controllers;

[ApiController]
[Route("api/tags")]
public class TagsController : ControllerBase
{
    private const string TagsCacheKey = "dict:tags:v1";
    private static readonly TimeSpan TagsCacheDuration = TimeSpan.FromMinutes(60);

    private readonly AppDbContext _db;
    private readonly IAppCache _cache;

    public TagsController(AppDbContext db, IAppCache cache)
    {
        _db = db;
        _cache = cache;
    }

    public record TagResponse(
        string Id,
        string Name,
        bool IsActive,
        string CreatedAt,
        string UpdatedAt
    );

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var rows = await _cache.GetOrCreateAsync(
            TagsCacheKey,
            TagsCacheDuration,
            async token => await _db.Tags.AsNoTracking()
                .OrderBy(x => x.Name)
                .Select(x => new TagResponse(
                    x.Id.ToString(CultureInfo.InvariantCulture),
                    x.Name,
                    x.IsActive,
                    DateTimeHelper.FormatUtc(x.CreatedAt),
                    DateTimeHelper.FormatUtc(x.UpdatedAt)
                ))
                .ToListAsync(token),
            ct
        ) ?? [];

        return Ok(rows);
    }

    public record TagUpsertRequest(string Name);

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] TagUpsertRequest req, CancellationToken ct)
    {
        if (req is null || string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { error = "Name is required." });

        var name = req.Name.Trim();
        var exists = await _db.Tags.AsNoTracking().AnyAsync(x => x.Name == name, ct);
        if (exists)
            return Conflict(new { error = "Tag already exists." });

        var tag = new Tag
        {
            Name = name,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Tags.Add(tag);
        await _db.SaveChangesAsync(ct);
        await _cache.RemoveAsync(TagsCacheKey, ct);

        return Ok(new TagResponse(
            tag.Id.ToString(CultureInfo.InvariantCulture),
            tag.Name,
            tag.IsActive,
            DateTimeHelper.FormatUtc(tag.CreatedAt),
            DateTimeHelper.FormatUtc(tag.UpdatedAt)
        ));
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] TagUpsertRequest req, CancellationToken ct)
    {
        if (req is null || string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { error = "Name is required." });

        var tag = await _db.Tags.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (tag is null)
            return NotFound(new { error = "Tag not found." });

        var name = req.Name.Trim();
        var exists = await _db.Tags.AsNoTracking()
            .AnyAsync(x => x.Name == name && x.Id != id, ct);
        if (exists)
            return Conflict(new { error = "Tag already exists." });

        tag.Name = name;
        tag.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        await _cache.RemoveAsync(TagsCacheKey, ct);

        return Ok(new TagResponse(
            tag.Id.ToString(CultureInfo.InvariantCulture),
            tag.Name,
            tag.IsActive,
            DateTimeHelper.FormatUtc(tag.CreatedAt),
            DateTimeHelper.FormatUtc(tag.UpdatedAt)
        ));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        var tag = await _db.Tags.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (tag is null)
            return NotFound(new { error = "Tag not found." });

        var inUse = await _db.JobTags.AsNoTracking().AnyAsync(x => x.TagId == id, ct);
        if (inUse)
            return BadRequest(new { error = "Tag is used by jobs and cannot be deleted." });

        _db.Tags.Remove(tag);
        await _db.SaveChangesAsync(ct);
        await _cache.RemoveAsync(TagsCacheKey, ct);
        return Ok(new { success = true });
    }
}
