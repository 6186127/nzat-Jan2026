namespace Workshop.Api.Models
{
    public class RestockOrder
    {
        public int Id { get; set; }
        
        // 生成一个漂亮的补货单号，比如 RO-20260401-001 (RO = Restock Order)
        public string OrderNumber { get; set; } = string.Empty; 
        
        // 关联供应商
        public int? SupplierId { get; set; }
        public Supplier? Supplier { get; set; }

        // 状态: Draft(草稿), Sent(已发送), PartiallyReceived(部分到货), Completed(已全部入库)
        public string Status { get; set; } = "Draft"; 

        public DateTime CreatedAt { get; set; }
        public DateTime? ExpectedDate { get; set; } // 预计到货时间

        // 关联的补货明细
        public List<RestockOrderItem> Items { get; set; } = new();
    }
}