using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Workshop.Api.Options;

namespace Workshop.Api.Services;

public sealed class GmailBackgroundSyncService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<GmailBackgroundSyncService> _logger;
    private readonly GmailSyncOptions _options;

    public GmailBackgroundSyncService(
        IServiceScopeFactory scopeFactory,
        IOptions<GmailSyncOptions> options,
        ILogger<GmailBackgroundSyncService> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.Enabled)
        {
            _logger.LogInformation("Gmail background sync is disabled.");
            return;
        }

        if (_options.EffectiveStartupDelay > TimeSpan.Zero)
        {
            _logger.LogInformation(
                "Delaying Gmail background sync startup by {Delay}.",
                _options.EffectiveStartupDelay);

            try
            {
                await Task.Delay(_options.EffectiveStartupDelay, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            var delay = await RunCycleAsync(stoppingToken);
            try
            {
                await Task.Delay(delay, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private async Task<TimeSpan> RunCycleAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var syncService = scope.ServiceProvider.GetRequiredService<GmailThreadSyncService>();
        var delay = TimeSpan.FromSeconds(syncService.BackgroundPollIntervalSeconds);

        if (!syncService.BackgroundSyncEnabled)
            return delay;

        try
        {
            var poStateService = scope.ServiceProvider.GetRequiredService<JobPoStateService>();
            await poStateService.EnsureStatesForNeedsPoJobsAsync(ct);

            var targets = await syncService.GetActiveSyncTargetsAsync(ct);
            if (targets.Count == 0)
                return delay;

            foreach (var target in targets)
            {
                var result = await syncService.SyncThreadAsync(
                    target.CounterpartyEmail,
                    target.CorrelationId,
                    syncService.BackgroundThreadFetchLimit,
                    null,
                    ct);

                if (!result.Ok && !string.IsNullOrWhiteSpace(result.Warning))
                {
                    _logger.LogWarning(
                        "Background Gmail sync warning for {CorrelationId}/{CounterpartyEmail}: {Warning}",
                        target.CorrelationId,
                        target.CounterpartyEmail,
                        result.Warning);
                }
            }
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (OperationCanceledException ex)
        {
            _logger.LogWarning(ex, "Background Gmail sync cycle timed out.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Background Gmail sync cycle failed.");
        }

        return delay;
    }
}
