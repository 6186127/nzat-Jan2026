namespace Workshop.Api.Options;

public sealed class PoFollowUpOptions
{
    public const string SectionName = "PoFollowUp";

    public bool Enabled { get; set; } = true;
    public int PollIntervalSeconds { get; set; } = 60;
    public int? IntervalMinutesOverride { get; set; }
    public int WorkingHoursPerFollowUp { get; set; } = 5;
    public int WorkingDayStartHour { get; set; } = 9;
    public int WorkingDayEndHour { get; set; } = 17;
    public int MaxFollowUps { get; set; } = 2;
    public string TimeZoneId { get; set; } = "Pacific/Auckland";
}
