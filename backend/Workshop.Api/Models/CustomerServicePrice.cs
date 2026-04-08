namespace Workshop.Api.Models;

public class CustomerServicePrice
{
    public long Id { get; set; }
    public long CustomerId { get; set; }
    public long ServiceCatalogItemId { get; set; }
    public string XeroItemCode { get; set; } = "";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Customer? Customer { get; set; }
    public ServiceCatalogItem? ServiceCatalogItem { get; set; }
}
