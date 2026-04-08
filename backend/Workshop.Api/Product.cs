namespace Workshop.Api.Models
{
    public class Product
    {
        public int Id { get; set; }
        public int? CategoryId { get; set; }
        public int? SupplierId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public string? Specification { get; set; } // 规格
        public string? Unit { get; set; } // 单位 (瓶、个等)
        
        public int CurrentStock { get; set; } = 0;
        public int MinStockAlert { get; set; } = 0; // 警戒库存
        public int InTransitStock { get; set; } = 0; // 在途库存
        
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // 导航属性：告诉系统，这个商品属于哪个分类、哪个供应商
        public Category? Category { get; set; }
        public Supplier? Supplier { get; set; }
    }
}