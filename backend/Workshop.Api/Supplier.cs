namespace Workshop.Api.Models
{
    public class Supplier
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? ContactName { get; set; }
        public string? ContactPhone { get; set; }
        public string? Notes { get; set; }

        public ICollection<Product> Products { get; set; } = new List<Product>();
    }
}