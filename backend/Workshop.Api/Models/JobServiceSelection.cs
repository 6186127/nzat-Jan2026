namespace Workshop.Api.Models;

public class JobServiceSelection
{
    public long Id { get; set; }
    public long JobId { get; set; }
    public long ServiceCatalogItemId { get; set; }
    public string ServiceNameSnapshot { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Job? Job { get; set; }
    public ServiceCatalogItem? ServiceCatalogItem { get; set; }
}
