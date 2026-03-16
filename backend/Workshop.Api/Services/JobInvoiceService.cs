using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Workshop.Api.Data;
using Workshop.Api.DTOs;
using Workshop.Api.Models;

namespace Workshop.Api.Services;

public sealed class JobInvoiceService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly AppDbContext _db;
    private readonly XeroInvoiceService _xeroInvoiceService;

    public JobInvoiceService(AppDbContext db, XeroInvoiceService xeroInvoiceService)
    {
        _db = db;
        _xeroInvoiceService = xeroInvoiceService;
    }

    public async Task<JobInvoiceCreateResult> CreateDraftForJobAsync(long jobId, CancellationToken ct)
    {
        var existing = await _db.JobInvoices.AsNoTracking().FirstOrDefaultAsync(x => x.JobId == jobId, ct);
        if (existing is not null)
        {
            return JobInvoiceCreateResult.Success(existing, alreadyExists: true);
        }

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
            return JobInvoiceCreateResult.Fail(404, "Job not found.");

        var mechServices = await _db.JobMechServices.AsNoTracking()
            .Where(x => x.JobId == jobId)
            .OrderBy(x => x.CreatedAt)
            .ToListAsync(ct);
        var partsServices = await _db.JobPartsServices.AsNoTracking()
            .Where(x => x.JobId == jobId)
            .OrderBy(x => x.CreatedAt)
            .ToListAsync(ct);
        var paintService = await _db.JobPaintServices.AsNoTracking()
            .Where(x => x.JobId == jobId)
            .OrderBy(x => x.CreatedAt)
            .FirstOrDefaultAsync(ct);

        CreateXeroInvoiceRequest request;
        try
        {
            request = BuildCreateRequest(row.Job, row.Customer, row.Vehicle, mechServices, partsServices, paintService);
        }
        catch (InvalidOperationException ex)
        {
            return JobInvoiceCreateResult.Fail(400, ex.Message);
        }

        var createResult = await _xeroInvoiceService.CreateInvoiceAsync(
            request,
            new XeroInvoiceCreateOptions
            {
                SummarizeErrors = true,
            },
            ct);

        if (!createResult.Ok)
        {
            return JobInvoiceCreateResult.Fail(
                createResult.StatusCode,
                createResult.Error ?? "Failed to create Xero draft invoice.",
                createResult.Payload,
                request,
                createResult.RefreshToken,
                createResult.RefreshTokenUpdated,
                createResult.Scope,
                createResult.ExpiresIn);
        }

        var jobInvoice = BuildJobInvoice(jobId, request, createResult.Payload, createResult.TenantId);
        _db.JobInvoices.Add(jobInvoice);
        await _db.SaveChangesAsync(ct);

        return JobInvoiceCreateResult.Success(
            jobInvoice,
            alreadyExists: false,
            payload: createResult.Payload,
            requestBody: request,
            refreshToken: createResult.RefreshToken,
            refreshTokenUpdated: createResult.RefreshTokenUpdated,
            scope: createResult.Scope,
            expiresIn: createResult.ExpiresIn);
    }

    private static CreateXeroInvoiceRequest BuildCreateRequest(
        Job job,
        Customer customer,
        Vehicle vehicle,
        IReadOnlyList<JobMechService> mechServices,
        IReadOnlyList<JobPartsService> partsServices,
        JobPaintService? paintService)
    {
        var reference = BuildReference(customer);
        var contactName = BuildContactName(customer, vehicle);
        if (string.IsNullOrWhiteSpace(contactName))
            throw new InvalidOperationException("Unable to derive contact name for invoice.");

        var lineItems = new List<XeroInvoiceLineItemInput>();

        lineItems.AddRange(mechServices
            .Where(x => !string.IsNullOrWhiteSpace(x.Description))
            .Select(x => new XeroInvoiceLineItemInput
            {
                Description = x.Description.Trim(),
                Quantity = 1m,
                UnitAmount = x.Cost ?? 0m,
            }));

        lineItems.AddRange(partsServices
            .Where(x => !string.IsNullOrWhiteSpace(x.Description))
            .Select(x => new XeroInvoiceLineItemInput
            {
                Description = x.Description.Trim(),
                Quantity = 1m,
                UnitAmount = 0m,
            }));

        if (paintService is not null)
        {
            lineItems.Add(new XeroInvoiceLineItemInput
            {
                Description = paintService.Panels > 0
                    ? $"Paint service - {paintService.Panels} panel(s)"
                    : "Paint service",
                Quantity = 1m,
                UnitAmount = 0m,
            });
        }

        var jobNote = job.Notes?.Trim();
        if (!string.IsNullOrWhiteSpace(jobNote))
        {
            lineItems.Add(new XeroInvoiceLineItemInput
            {
                Description = jobNote,
                Quantity = 1m,
                UnitAmount = 0m,
            });
        }

        if (lineItems.Count == 0)
        {
            lineItems.Add(new XeroInvoiceLineItemInput
            {
                Description = "Job draft",
                Quantity = 1m,
                UnitAmount = 0m,
            });
        }

        return new CreateXeroInvoiceRequest
        {
            Type = "ACCREC",
            Status = "DRAFT",
            LineAmountTypes = "Exclusive",
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            Reference = reference,
            Contact = new XeroInvoiceContactInput
            {
                Name = contactName,
            },
            LineItems = lineItems,
        };
    }

    private static string BuildReference(Customer customer)
    {
        if (string.Equals(customer.Type, "Personal", StringComparison.OrdinalIgnoreCase))
        {
            var parts = new[] { customer.Name, customer.Phone }
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x!.Trim());
            return string.Join(' ', parts);
        }

        return "等待PO confirm";
    }

    private static string BuildContactName(Customer customer, Vehicle vehicle)
    {
        if (!string.Equals(customer.Type, "Personal", StringComparison.OrdinalIgnoreCase))
            return customer.Name.Trim();

        var vehicleSummary = new[]
            {
                vehicle.Year > 0 ? vehicle.Year.ToString() : null,
                vehicle.Make,
                vehicle.Model,
            }
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x!.Trim().ToUpperInvariant())
            .ToList();

        var rego = vehicle.Plate?.Trim().ToUpperInvariant();
        if (!string.IsNullOrWhiteSpace(rego))
            vehicleSummary.Insert(0, rego);

        return vehicleSummary.Count > 0
            ? string.Join(' ', vehicleSummary)
            : customer.Name.Trim();
    }

    private static JobInvoice BuildJobInvoice(long jobId, CreateXeroInvoiceRequest request, object? payload, string? tenantId)
    {
        var extracted = ExtractInvoiceSummary(payload);
        var now = DateTime.UtcNow;

        return new JobInvoice
        {
            JobId = jobId,
            Provider = "xero",
            ExternalInvoiceId = extracted.InvoiceId,
            ExternalInvoiceNumber = extracted.InvoiceNumber,
            ExternalStatus = extracted.Status ?? request.Status,
            Reference = extracted.Reference ?? request.Reference,
            ContactName = extracted.ContactName ?? request.Contact.Name,
            InvoiceDate = extracted.Date ?? request.Date,
            LineAmountTypes = request.LineAmountTypes,
            TenantId = tenantId,
            RequestPayloadJson = JsonSerializer.Serialize(request, JsonOptions),
            ResponsePayloadJson = payload is null ? null : JsonSerializer.Serialize(payload, JsonOptions),
            CreatedAt = now,
            UpdatedAt = now,
        };
    }

    private static ExtractedInvoiceSummary ExtractInvoiceSummary(object? payload)
    {
        if (payload is null)
            return new ExtractedInvoiceSummary();

        var json = JsonSerializer.Serialize(payload, JsonOptions);
        if (string.IsNullOrWhiteSpace(json))
            return new ExtractedInvoiceSummary();

        try
        {
            using var document = JsonDocument.Parse(json);
            if (!document.RootElement.TryGetProperty("Invoices", out var invoices) || invoices.ValueKind != JsonValueKind.Array)
                return new ExtractedInvoiceSummary();

            var invoice = invoices.EnumerateArray().FirstOrDefault();
            if (invoice.ValueKind == JsonValueKind.Undefined)
                return new ExtractedInvoiceSummary();

            var contactName = invoice.TryGetProperty("Contact", out var contact) && contact.ValueKind == JsonValueKind.Object &&
                              contact.TryGetProperty("Name", out var nameElement)
                ? nameElement.GetString()
                : null;

            DateOnly? date = null;
            if (invoice.TryGetProperty("DateString", out var dateStringElement) && dateStringElement.ValueKind == JsonValueKind.String &&
                DateOnly.TryParse(dateStringElement.GetString(), out var parsedDateString))
            {
                date = parsedDateString;
            }
            else if (invoice.TryGetProperty("Date", out var dateElement) && dateElement.ValueKind == JsonValueKind.String &&
                     DateTime.TryParse(dateElement.GetString(), out var parsedDateTime))
            {
                date = DateOnly.FromDateTime(parsedDateTime);
            }

            return new ExtractedInvoiceSummary
            {
                InvoiceId = TryGetString(invoice, "InvoiceID"),
                InvoiceNumber = TryGetString(invoice, "InvoiceNumber"),
                Status = TryGetString(invoice, "Status"),
                Reference = TryGetString(invoice, "Reference"),
                ContactName = contactName,
                Date = date,
            };
        }
        catch (JsonException)
        {
            return new ExtractedInvoiceSummary();
        }
    }

    private static string? TryGetString(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var value) || value.ValueKind != JsonValueKind.String)
            return null;

        return value.GetString();
    }

    private sealed class ExtractedInvoiceSummary
    {
        public string? InvoiceId { get; init; }
        public string? InvoiceNumber { get; init; }
        public string? Status { get; init; }
        public string? Reference { get; init; }
        public string? ContactName { get; init; }
        public DateOnly? Date { get; init; }
    }
}

public sealed class JobInvoiceCreateResult
{
    public bool Ok { get; private init; }
    public int StatusCode { get; private init; }
    public string? Error { get; private init; }
    public bool AlreadyExists { get; private init; }
    public JobInvoice? Invoice { get; private init; }
    public object? Payload { get; private init; }
    public CreateXeroInvoiceRequest? RequestBody { get; private init; }
    public string Scope { get; private init; } = "";
    public int AccessTokenExpiresIn { get; private init; }
    public string LatestRefreshToken { get; private init; } = "";
    public bool RefreshTokenUpdated { get; private init; }

    public static JobInvoiceCreateResult Success(
        JobInvoice invoice,
        bool alreadyExists,
        object? payload = null,
        CreateXeroInvoiceRequest? requestBody = null,
        string? refreshToken = null,
        bool refreshTokenUpdated = false,
        string? scope = null,
        int expiresIn = 0) =>
        new()
        {
            Ok = true,
            StatusCode = alreadyExists ? 200 : 201,
            AlreadyExists = alreadyExists,
            Invoice = invoice,
            Payload = payload,
            RequestBody = requestBody,
            LatestRefreshToken = refreshToken ?? "",
            RefreshTokenUpdated = refreshTokenUpdated,
            Scope = scope ?? "",
            AccessTokenExpiresIn = expiresIn,
        };

    public static JobInvoiceCreateResult Fail(
        int statusCode,
        string error,
        object? payload = null,
        CreateXeroInvoiceRequest? requestBody = null,
        string? refreshToken = null,
        bool refreshTokenUpdated = false,
        string? scope = null,
        int expiresIn = 0) =>
        new()
        {
            Ok = false,
            StatusCode = statusCode,
            Error = error,
            Payload = payload,
            RequestBody = requestBody,
            LatestRefreshToken = refreshToken ?? "",
            RefreshTokenUpdated = refreshTokenUpdated,
            Scope = scope ?? "",
            AccessTokenExpiresIn = expiresIn,
        };
}
