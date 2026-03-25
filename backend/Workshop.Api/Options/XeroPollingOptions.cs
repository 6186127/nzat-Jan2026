namespace Workshop.Api.Options;

public sealed class XeroPollingOptions
{
    public const string SectionName = "XeroPolling";

    public bool Enabled { get; set; } = true;
    public int PollIntervalMinutes { get; set; } = 10;
    public int MaxInvoicesPerCycle { get; set; } = 25;
}
