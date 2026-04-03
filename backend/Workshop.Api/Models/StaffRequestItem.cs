namespace Workshop.Api.Models
{
    public class StaffRequestItem
    {
        public int Id { get; set; }
        
        public int RequestId { get; set; }
        public StaffRequest? Request { get; set; }

        // 👇 彻底断开 Product，改为 MaterialId
        public int MaterialId { get; set; }
        public WorkshopMaterial? Material { get; set; }

        public int Quantity { get; set; }
    }
}