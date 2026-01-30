using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Workshop.Api.Data;

namespace Workshop.Api.Controllers;

[ApiController]
[Route("api/wof-fail-reasons")]
public class WofFailReasonsController : ControllerBase
{
    private readonly AppDbContext _db;

    public WofFailReasonsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var reasons = await _db.WofFailReasons.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Label)
            .Select(x => new
            {
                id = x.Id.ToString(),
                label = x.Label
            })
            .ToListAsync(ct);

        return Ok(reasons);
    }
}
