using NpgsqlTypes;

namespace Workshop.Api.Models;

public class WorklogEntry
{
    public long Id { get; set; }
    public long JobId { get; set; }
    public long StaffId { get; set; }
    public WorklogServiceType ServiceType { get; set; } = WorklogServiceType.Pnp;
    public DateTime WorkDate { get; set; }
    public string StartTime { get; set; } = "";
    public string EndTime { get; set; } = "";
    public string AdminNote { get; set; } = "";
    public string Source { get; set; } = "admin";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public Staff? Staff { get; set; }
    public Job? Job { get; set; }
}

public enum WorklogServiceType
{
    [PgName("pnp")] Pnp,
    [PgName("mech")] Mech,
}
