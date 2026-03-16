using Microsoft.AspNetCore.Mvc;
using Workshop.Api.Services;

namespace Workshop.Api.Controllers;

[ApiController]
[Route("api/inventory-items")]
public class InventoryItemsController : ControllerBase
{
    private readonly InventoryItemService _inventoryItemService;

    public InventoryItemsController(InventoryItemService inventoryItemService)
    {
        _inventoryItemService = inventoryItemService;
    }

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string? query, [FromQuery] int limit = 20, CancellationToken ct = default)
    {
        var items = await _inventoryItemService.SearchAsync(query, limit, ct);
        return Ok(items);
    }

    [HttpPost("import")]
    public async Task<IActionResult> Import(CancellationToken ct)
    {
        var result = await _inventoryItemService.ImportFromConfiguredFileAsync(ct);
        if (!result.Ok)
            return BadRequest(new { error = result.Error });

        return Ok(new
        {
            success = true,
            importedCount = result.ImportedCount,
            sourcePath = result.SourcePath,
        });
    }
}
