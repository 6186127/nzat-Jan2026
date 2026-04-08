namespace Workshop.Api.Models
{
    public class RestockOrderItem
    {
        public int Id { get; set; }
        
        public int RestockOrderId { get; set; }
        public RestockOrder? RestockOrder { get; set; }

        // 👇 彻底断开 Product，改为 MaterialId
        public int MaterialId { get; set; }
        public WorkshopMaterial? Material { get; set; }

        public int Quantity { get; set; } 
        public int ReceivedQuantity { get; set; } 
    }
}