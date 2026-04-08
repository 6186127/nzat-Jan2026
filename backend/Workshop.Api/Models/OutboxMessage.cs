namespace Workshop.Api.Models;

public class OutboxMessage
{
    public long Id { get; set; }
    public string MessageType { get; set; } = "";
    public string AggregateType { get; set; } = "";
    public long AggregateId { get; set; }
    public string PayloadJson { get; set; } = "{}";
    public string Status { get; set; } = "pending";
    public int AttemptCount { get; set; }
    public DateTime AvailableAt { get; set; }
    public DateTime? LockedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public string? LastError { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
