namespace Workshop.Api.Models;

public class CustomerStaff
{
    public long Id { get; set; }
    public long CustomerId { get; set; }
    public string Name { get; set; } = "";
    public string? Title { get; set; }
    public string? Email { get; set; }

    public Customer Customer { get; set; } = null!;
}
