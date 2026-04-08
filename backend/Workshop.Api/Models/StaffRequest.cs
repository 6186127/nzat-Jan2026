namespace Workshop.Api.Models
{
    public class StaffRequest
    {
        public int Id { get; set; }
        public string StaffName { get; set; } = string.Empty; // 谁提交的
        public string? Notes { get; set; } // 留言备注
        public string Status { get; set; } = "Pending"; // 状态：Pending(待处理), Ordered(已下单), Completed(已到货)
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // 导航属性：一张单子里面包含多个商品明细
        public ICollection<StaffRequestItem> Items { get; set; } = new List<StaffRequestItem>();
    }
}