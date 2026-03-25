namespace Workshop.Api.Options;

public sealed class GmailSyncOptions
{
    public const string SectionName = "GmailSync";

    public bool Enabled { get; set; } = true;
    public int PollIntervalSeconds { get; set; } = 300;
    public int ThreadFetchLimit { get; set; } = 20;
    public int DbFreshForSeconds { get; set; } = 300;
    public int ActiveThreadLookbackDays { get; set; } = 30;
    public int MaxThreadsPerCycle { get; set; } = 25;
}
