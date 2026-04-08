using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Workshop.Api.Services;

public sealed class PoStateSchemaInitializerService : IHostedService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PoStateSchemaInitializerService> _logger;

    public PoStateSchemaInitializerService(
        IServiceScopeFactory scopeFactory,
        ILogger<PoStateSchemaInitializerService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var inventoryItemService = scope.ServiceProvider.GetRequiredService<InventoryItemService>();
        var serviceCatalogService = scope.ServiceProvider.GetRequiredService<ServiceCatalogService>();
        var poStateService = scope.ServiceProvider.GetRequiredService<JobPoStateService>();

        try
        {
            await inventoryItemService.EnsureSeededAsync(cancellationToken);
            await serviceCatalogService.EnsureSeededAsync(cancellationToken);
            await poStateService.EnsureStatesForNeedsPoJobsAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize PO state schema.");
            throw;
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
