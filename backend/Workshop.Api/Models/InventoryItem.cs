namespace Workshop.Api.Models;

public class InventoryItem
{
    public long Id { get; set; }
    public string ItemCode { get; set; } = "";
    public string ItemName { get; set; } = "";
    public decimal? Quantity { get; set; }
    public string? PurchasesDescription { get; set; }
    public decimal? PurchasesUnitPrice { get; set; }
    public string? PurchasesAccount { get; set; }
    public string? PurchasesTaxRate { get; set; }
    public string? SalesDescription { get; set; }
    public decimal? SalesUnitPrice { get; set; }
    public string? SalesAccount { get; set; }
    public string? SalesTaxRate { get; set; }
    public string? InventoryAssetAccount { get; set; }
    public string? CostOfGoodsSoldAccount { get; set; }
    public string Status { get; set; } = "";
    public string? InventoryType { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
