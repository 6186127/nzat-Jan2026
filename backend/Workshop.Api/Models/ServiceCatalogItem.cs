namespace Workshop.Api.Models;

public class ServiceCatalogItem
{
    public long Id { get; set; }
    public string ServiceType { get; set; } = "";
    public string Category { get; set; } = "";
    public string Name { get; set; } = "";
    public string? PersonalLinkCode { get; set; }
    public string? DealershipLinkCode { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
