namespace Workshop.Api.Models;

public class InactiveGmailCorrelation
{
    public long Id { get; set; }
    public string CorrelationId { get; set; } = "";
    public string? Reason { get; set; }
    public DateTime CreatedAt { get; set; }
}
