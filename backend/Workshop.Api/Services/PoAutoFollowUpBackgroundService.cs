using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Workshop.Api.Options;

namespace Workshop.Api.Services;

public sealed class PoAutoFollowUpBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PoAutoFollowUpBackgroundService> _logger;
    private readonly PoFollowUpOptions _options;

    public PoAutoFollowUpBackgroundService(
        IServiceScopeFactory scopeFactory,
        IOptions<PoFollowUpOptions> options,
        ILogger<PoAutoFollowUpBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.Enabled)
        {
            _logger.LogInformation("Automatic PO follow-up is disabled.");
            return;
        }

        if (_options.EffectiveStartupDelay > TimeSpan.Zero)
        {
            _logger.LogInformation(
                "Delaying automatic PO follow-up startup by {Delay}.",
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
            using var scope = _scopeFactory.CreateScope();
            var service = scope.ServiceProvider.GetRequiredService<PoAutoFollowUpService>();
            var delay = TimeSpan.FromSeconds(service.CheckIntervalSeconds);

            if (!service.Enabled)
            {
                await Task.Delay(delay, stoppingToken);
                continue;
            }

            try
            {
                await service.RunCycleAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Automatic PO follow-up cycle failed.");
            }

            await Task.Delay(delay, stoppingToken);
        }
    }
}
