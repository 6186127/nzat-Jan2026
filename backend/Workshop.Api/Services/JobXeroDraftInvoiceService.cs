using Microsoft.EntityFrameworkCore;
using Workshop.Api.Data;
using Workshop.Api.DTOs;

namespace Workshop.Api.Services;

public sealed class JobXeroDraftInvoiceService
{
    private readonly AppDbContext _db;
    private readonly XeroInvoiceService _xeroInvoiceService;

    public JobXeroDraftInvoiceService(
        AppDbContext db,
        XeroInvoiceService xeroInvoiceService)
    {
        _db = db;
        _xeroInvoiceService = xeroInvoiceService;
    }

    public async Task<JobXeroDraftInvoiceResult> CreateForJobAsync(long jobId, CancellationToken ct)
    {
        var row = await (
                from j in _db.Jobs.AsNoTracking()
                join v in _db.Vehicles.AsNoTracking() on j.VehicleId equals v.Id
                join c in _db.Customers.AsNoTracking() on j.CustomerId equals c.Id
                where j.Id == jobId
                select new
                {
                    Job = j,
                    Vehicle = v,
                    Customer = c,
                }
            )
            .FirstOrDefaultAsync(ct);

        if (row is null)
            return JobXeroDraftInvoiceResult.Fail(404, "Job not found.");

        var contactName = BuildContactName(row.Customer.Type, row.Customer.Name, row.Vehicle.Plate, row.Vehicle.Make, row.Vehicle.Model);
        if (string.IsNullOrWhiteSpace(contactName))
            return JobXeroDraftInvoiceResult.Fail(400, "Unable to derive contact name for Xero.");

        var jobNote = row.Job.Notes?.Trim();
        if (string.IsNullOrWhiteSpace(jobNote))
        {
            return JobXeroDraftInvoiceResult.Fail(400, "Job note is empty. Please fill in the job note before creating the Xero invoice.");
        }

        var request = new CreateXeroInvoiceRequest
        {
            Type = "ACCREC",
            Status = "DRAFT",
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            Reference = $"JOB-{jobId}",
            Contact = new XeroInvoiceContactInput
            {
                Name = contactName,
            },
            LineItems =
            [
                new XeroInvoiceLineItemInput
                {
                    Description = jobNote,
                    LineAmount = 0m,
                },
            ],
        };

        var createResult = await _xeroInvoiceService.CreateInvoiceAsync(
            request,
            new XeroInvoiceCreateOptions
            {
                SummarizeErrors = true,
            },
            ct);

        var details = new JobXeroDraftInvoiceDetails
        {
            JobId = jobId,
            CustomerType = row.Customer.Type,
            ContactName = contactName,
            JobNote = jobNote,
            RequestBody = request,
            XeroResponse = createResult.Payload,
            Scope = createResult.Scope,
            AccessTokenExpiresIn = createResult.ExpiresIn,
            LatestRefreshToken = createResult.RefreshToken,
            RefreshTokenUpdated = createResult.RefreshTokenUpdated,
        };

        if (!createResult.Ok)
        {
            return JobXeroDraftInvoiceResult.Fail(
                createResult.StatusCode,
                createResult.Error ?? "Failed to create Xero draft invoice.",
                details);
        }

        return JobXeroDraftInvoiceResult.Success(details);
    }

    private static string BuildContactName(string customerType, string customerName, string plate, string? make, string? model)
    {
        if (string.Equals(customerType, "Personal", StringComparison.OrdinalIgnoreCase))
        {
            return string.Join(' ', new[] { plate, make, model }
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x!.Trim()));
        }

        return customerName.Trim();
    }
}

public sealed class JobXeroDraftInvoiceResult
{
    public bool Ok { get; private init; }
    public int StatusCode { get; private init; }
    public string? Error { get; private init; }
    public JobXeroDraftInvoiceDetails? Details { get; private init; }

    public static JobXeroDraftInvoiceResult Success(JobXeroDraftInvoiceDetails details) =>
        new()
        {
            Ok = true,
            StatusCode = 200,
            Details = details,
        };

    public static JobXeroDraftInvoiceResult Fail(int statusCode, string error, JobXeroDraftInvoiceDetails? details = null) =>
        new()
        {
            Ok = false,
            StatusCode = statusCode,
            Error = error,
            Details = details,
        };
}

public sealed class JobXeroDraftInvoiceDetails
{
    public long JobId { get; init; }
    public string CustomerType { get; init; } = "";
    public string ContactName { get; init; } = "";
    public string JobNote { get; init; } = "";
    public CreateXeroInvoiceRequest RequestBody { get; init; } = new();
    public object? XeroResponse { get; init; }
    public string Scope { get; init; } = "";
    public int AccessTokenExpiresIn { get; init; }
    public string LatestRefreshToken { get; init; } = "";
    public bool RefreshTokenUpdated { get; init; }
}
