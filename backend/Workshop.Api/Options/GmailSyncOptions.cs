namespace Workshop.Api.Options;

public sealed class GmailSyncOptions
{
    public const string SectionName = "GmailSync";

    public bool Enabled { get; set; } = true;
    public int StartupDelaySeconds { get; set; } = 180;
    public int PollIntervalSeconds { get; set; } = 300;
    public int ThreadFetchLimit { get; set; } = 20;
    public int DbFreshForSeconds { get; set; } = 300;
    public int ActiveThreadLookbackDays { get; set; } = 30;
    public int MaxThreadsPerCycle { get; set; } = 25;

    public TimeSpan EffectiveStartupDelay =>
        TimeSpan.FromSeconds(Math.Max(0, StartupDelaySeconds));
}
