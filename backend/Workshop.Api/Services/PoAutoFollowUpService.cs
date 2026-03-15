using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Workshop.Api.Data;
using Workshop.Api.Models;
using Workshop.Api.Options;

namespace Workshop.Api.Services;

public sealed class PoAutoFollowUpService
{
    private readonly AppDbContext _db;
    private readonly BusinessHoursService _businessHoursService;
    private readonly GmailFollowUpSenderService _gmailFollowUpSenderService;
    private readonly JobPoStateService _jobPoStateService;
    private readonly PoFollowUpOptions _options;
    private readonly ILogger<PoAutoFollowUpService> _logger;

    public PoAutoFollowUpService(
        AppDbContext db,
        BusinessHoursService businessHoursService,
        GmailFollowUpSenderService gmailFollowUpSenderService,
        JobPoStateService jobPoStateService,
        IOptions<PoFollowUpOptions> options,
        ILogger<PoAutoFollowUpService> logger)
    {
        _db = db;
        _businessHoursService = businessHoursService;
        _gmailFollowUpSenderService = gmailFollowUpSenderService;
        _jobPoStateService = jobPoStateService;
        _options = options.Value;
        _logger = logger;
    }

    public int PollIntervalSeconds => Math.Max(30, _options.PollIntervalSeconds);
    public bool Enabled => _options.Enabled;

    public async Task RunCycleAsync(CancellationToken ct)
    {
        await _jobPoStateService.EnsureStatesForNeedsPoJobsAsync(ct);

        var candidateStates = await _db.JobPoStates
            .Where(x => x.FollowUpEnabled)
            .Where(x => x.Status == JobPoStateStatus.AwaitingReply || x.Status == JobPoStateStatus.EscalationRequired)
            .OrderBy(x => x.JobId)
            .ToListAsync(ct);

        foreach (var state in candidateStates)
        {
            await _jobPoStateService.SyncStateForJobAsync(state.JobId, ct);
        }

        var dueStates = await _db.JobPoStates
            .Where(x => x.FollowUpEnabled)
            .Where(x => x.Status == JobPoStateStatus.AwaitingReply)
            .Where(x => x.NextFollowUpDueAt.HasValue && x.NextFollowUpDueAt.Value <= DateTime.UtcNow)
            .OrderBy(x => x.NextFollowUpDueAt)
            .ToListAsync(ct);

        foreach (var state in dueStates)
        {
            if (state.FollowUpCount >= Math.Max(1, _options.MaxFollowUps))
            {
                state.Status = JobPoStateStatus.EscalationRequired;
                state.RequiresAdminAttention = true;
                state.AdminAttentionReason = "No supplier reply after 2 follow-ups.";
                state.NextFollowUpDueAt = null;
                state.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync(ct);
                continue;
            }

            var sent = await _gmailFollowUpSenderService.SendFollowUpAsync(state, ct);
            if (!sent)
            {
                _logger.LogWarning("Automatic PO follow-up failed for job {JobId}.", state.JobId);
                continue;
            }

            await _jobPoStateService.SyncStateForJobAsync(state.JobId, ct);
        }
    }
}
