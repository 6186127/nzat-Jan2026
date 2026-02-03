using System.Data;
using System.Globalization;
using System.IO;
using System.Text;
using ExcelDataReader;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Workshop.Api.Data;
using Workshop.Api.Models;

namespace Workshop.Api.Controllers;

[ApiController]
[Route("api/jobs")]
public class JobsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public JobsController(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var rows = await (
                from j in _db.Jobs.AsNoTracking()
                join v in _db.Vehicles.AsNoTracking() on j.VehicleId equals v.Id
                join c in _db.Customers.AsNoTracking() on j.CustomerId equals c.Id
                orderby j.CreatedAt descending
                select new
                {
                    j.Id,
                    j.Status,
                    j.IsUrgent,
                    j.CreatedAt,
                    Vehicle = v,
                    Customer = c
                }
            )
            .ToListAsync(ct);

        var items = rows.Select(r => new
        {
            id = r.Id.ToString(CultureInfo.InvariantCulture),
            vehicleStatus = MapStatus(r.Status),
            urgent = r.IsUrgent,
            selectedTags = r.IsUrgent ? new[] { "Urgent" } : Array.Empty<string>(),
            plate = r.Vehicle.Plate,
            vehicleModel = BuildVehicleModel(r.Vehicle.Make, r.Vehicle.Model, r.Vehicle.Year),
            wofPct = (int?)null,
            mechPct = (int?)null,
            paintPct = (int?)null,
            customerName = r.Customer.Name,
            customerPhone = r.Customer.Phone ?? "",
            createdAt = r.CreatedAt.ToString("yyyy/MM/dd HH:mm", CultureInfo.InvariantCulture)
        });

        return Ok(items);
    }

    [HttpGet("tags")]
    public async Task<IActionResult> GetTags([FromQuery] string? ids, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(ids))
            return Ok(Array.Empty<object>());

        var jobIds = ids.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(id => long.TryParse(id, out var parsed) ? parsed : (long?)null)
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToArray();

        if (jobIds.Length == 0)
            return Ok(Array.Empty<object>());

        var rows = await (
                from jt in _db.JobTags.AsNoTracking()
                join t in _db.Tags.AsNoTracking() on jt.TagId equals t.Id
                where jobIds.Contains(jt.JobId) && t.IsActive
                select new { jt.JobId, t.Name }
            )
            .ToListAsync(ct);

        var grouped = rows
            .GroupBy(x => x.JobId)
            .Select(g => new
            {
                jobId = g.Key.ToString(CultureInfo.InvariantCulture),
                tags = g.Select(x => x.Name).Distinct().ToArray()
            })
            .ToList();

        return Ok(grouped);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id, CancellationToken ct)
    {
        var row = await (
                from j in _db.Jobs.AsNoTracking()
                join v in _db.Vehicles.AsNoTracking() on j.VehicleId equals v.Id
                join c in _db.Customers.AsNoTracking() on j.CustomerId equals c.Id
                where j.Id == id
                select new
                {
                    Job = j,
                    Vehicle = v,
                    Customer = c
                }
            )
            .FirstOrDefaultAsync(ct);

        if (row is null)
            return NotFound(new { error = "Job not found." });

        var hasWofRecord = await _db.JobWofRecords.AsNoTracking().AnyAsync(x => x.JobId == id, ct);

        var tagNames = await (
                from jt in _db.JobTags.AsNoTracking()
                join t in _db.Tags.AsNoTracking() on jt.TagId equals t.Id
                where jt.JobId == id && t.IsActive
                select t.Name
            )
            .Distinct()
            .ToListAsync(ct);

        var job = new
        {
            id = row.Job.Id.ToString(CultureInfo.InvariantCulture),
            status = MapDetailStatus(row.Job.Status),
            isUrgent = row.Job.IsUrgent,
            tags = tagNames.ToArray(),
            vehicle = new
            {
                plate = row.Vehicle.Plate,
                make = row.Vehicle.Make,
                model = row.Vehicle.Model,
                year = row.Vehicle.Year,
                vin = row.Vehicle.Vin,
                engine = row.Vehicle.Engine,
                regoExpiry = FormatDate(row.Vehicle.RegoExpiry),
                colour = row.Vehicle.Colour,
                bodyStyle = row.Vehicle.BodyStyle,
                engineNo = row.Vehicle.EngineNo,
                chassis = row.Vehicle.Chassis,
                ccRating = row.Vehicle.CcRating,
                fuelType = row.Vehicle.FuelType,
                seats = row.Vehicle.Seats,
                countryOfOrigin = row.Vehicle.CountryOfOrigin,
                grossVehicleMass = row.Vehicle.GrossVehicleMass,
                refrigerant = row.Vehicle.Refrigerant,
                fuelTankCapacityLitres = row.Vehicle.FuelTankCapacityLitres,
                fullCombinedRangeKm = row.Vehicle.FullCombinedRangeKm,
                wofExpiry = FormatDate(row.Vehicle.WofExpiry),
                odometer = row.Vehicle.Odometer,
                nzFirstRegistration = FormatDate(row.Vehicle.NzFirstRegistration),
                customerId = row.Vehicle.CustomerId,
                updatedAt = FormatDateTime(row.Vehicle.UpdatedAt),
                // rawJson = row.Vehicle.RawJson
            },
            customer = new
            {
                type = row.Customer.Type,
                name = row.Customer.Name,
                phone = row.Customer.Phone,
                email = row.Customer.Email,
                address = row.Customer.Address,
                businessCode = row.Customer.BusinessCode,
                accountTerms = "",
                discount = "",
                notes = row.Customer.Notes
            }
        };

        return Ok(new { job, hasWofRecord });
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> DeleteJob(long id, CancellationToken ct)
    {
        var job = await _db.Jobs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (job is null)
            return NotFound(new { error = "Job not found." });

        await using var tx = await _db.Database.BeginTransactionAsync(ct);

        await _db.JobWofRecords.Where(x => x.JobId == id).ExecuteDeleteAsync(ct);

        var deletedJobs = await _db.Jobs.Where(x => x.Id == id).ExecuteDeleteAsync(ct);
        if (deletedJobs == 0)
            return NotFound(new { error = "Job not found." });

        var vehicleDeleted = false;
        var customerDeleted = false;

        if (job.VehicleId.HasValue)
        {
            var otherJobs = await _db.Jobs.AsNoTracking()
                .AnyAsync(x => x.VehicleId == job.VehicleId.Value, ct);
            if (!otherJobs)
            {
                var deletedVehicles = await _db.Vehicles
                    .Where(x => x.Id == job.VehicleId.Value)
                    .ExecuteDeleteAsync(ct);
                vehicleDeleted = deletedVehicles > 0;
            }
        }

        if (job.CustomerId.HasValue)
        {
            var otherJobs = await _db.Jobs.AsNoTracking()
                .AnyAsync(x => x.CustomerId == job.CustomerId.Value, ct);
            if (!otherJobs)
            {
                var deletedCustomers = await _db.Customers
                    .Where(x => x.Id == job.CustomerId.Value)
                    .ExecuteDeleteAsync(ct);
                customerDeleted = deletedCustomers > 0;
            }
        }

        await tx.CommitAsync(ct);

        return Ok(new { success = true, vehicleDeleted, customerDeleted });
    }

    public record UpdateJobTagsRequest(long[] TagIds);

    [HttpPut("{id:long}/tags")]
    public async Task<IActionResult> UpdateJobTags(long id, [FromBody] UpdateJobTagsRequest req, CancellationToken ct)
    {
        var jobExists = await _db.Jobs.AsNoTracking().AnyAsync(x => x.Id == id, ct);
        if (!jobExists)
            return NotFound(new { error = "Job not found." });

        var tagIds = req?.TagIds?.Distinct().ToArray() ?? Array.Empty<long>();
        if (tagIds.Length > 0)
        {
            var existingIds = await _db.Tags.AsNoTracking()
                .Where(x => tagIds.Contains(x.Id))
                .Select(x => x.Id)
                .ToListAsync(ct);
            if (existingIds.Count != tagIds.Length)
                return BadRequest(new { error = "One or more tags are invalid." });
        }

        await _db.JobTags.Where(x => x.JobId == id).ExecuteDeleteAsync(ct);

        if (tagIds.Length > 0)
        {
            var items = tagIds.Select(tagId => new JobTag
            {
                JobId = id,
                TagId = tagId,
                CreatedAt = DateTime.UtcNow
            });
            _db.JobTags.AddRange(items);
            await _db.SaveChangesAsync(ct);
        }

        var tagNames = await _db.Tags.AsNoTracking()
            .Where(x => tagIds.Contains(x.Id))
            .Select(x => x.Name)
            .ToArrayAsync(ct);

        return Ok(new { tags = tagNames });
    }

    [HttpGet("{id:long}/wof-server")]
    public async Task<IActionResult> GetWofRecords(long id, CancellationToken ct)
    {
        var jobExists = await _db.Jobs.AsNoTracking().AnyAsync(x => x.Id == id, ct);
        if (!jobExists)
            return NotFound(new { error = "Job not found." });

        var rows = await _db.JobWofRecords.AsNoTracking()
            .Where(x => x.JobId == id)
            .OrderByDescending(x => x.OccurredAt)
            .ThenByDescending(x => x.Id)
            .Select(x => new
            {
                x.Id,
                x.OccurredAt,
                x.Rego,
                x.MakeModel,
                x.Odo,
                x.RecordState,
                x.IsNewWof,
                x.AuthCode,
                x.CheckSheet,
                x.CsNo,
                x.WofLabel,
                x.LabelNo,
                x.FailReasons,
                x.PreviousExpiryDate,
                x.OrganisationName,
                x.ExcelRowNo,
                x.SourceFile,
                x.Note,
                x.WofUiState,
                x.ImportedAt,
                x.UpdatedAt
            })
            .ToListAsync(ct);

        var checkItems = rows.Select(x => new
            {
                id = x.Id.ToString(CultureInfo.InvariantCulture),
                wofId = id.ToString(CultureInfo.InvariantCulture),
                occurredAt = FormatDateTime(x.OccurredAt),
                rego = x.Rego,
                makeModel = x.MakeModel,
                recordState = ToRecordStateLabel(x.RecordState),
                isNewWof = x.IsNewWof,
                odo = x.Odo,
                authCode = x.AuthCode,
                checkSheet = x.CheckSheet,
                csNo = x.CsNo,
                wofLabel = x.WofLabel,
                labelNo = x.LabelNo,
                failReasons = x.FailReasons,
                previousExpiryDate = FormatDate(x.PreviousExpiryDate),
                organisationName = x.OrganisationName,
                note = x.Note ?? "",
                wofUiState = ToUiStateLabel(x.WofUiState),
                importedAt = FormatDateTime(x.ImportedAt),
                source = x.SourceFile ?? "excel",
                sourceRow = x.ExcelRowNo.ToString(CultureInfo.InvariantCulture),
                updatedAt = FormatDateTime(x.UpdatedAt)
            })
            .ToList();

        var results = rows.Select(x => new
            {
                id = x.Id.ToString(CultureInfo.InvariantCulture),
                wofId = id.ToString(CultureInfo.InvariantCulture),
                date = x.OccurredAt.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                result = ToRecordStateLabel(x.RecordState),
                recheckExpiryDate = FormatDate(x.PreviousExpiryDate),
                failReason = x.FailReasons,
                note = x.Note ?? "",
                source = x.SourceFile ?? "excel"
            })
            .ToList();

        return Ok(new
        {
            hasWofServer = rows.Count > 0,
            wofId = (string?)null,
            checkItems,
            results
        });
    }

    [HttpPost("{id:long}/wof-records/import")]
    public async Task<IActionResult> ImportWofRecords(long id, CancellationToken ct)
    {
        var job = await (
                from j in _db.Jobs.AsNoTracking()
                join v in _db.Vehicles.AsNoTracking() on j.VehicleId equals v.Id
                where j.Id == id
                select new { j.Id, Plate = v.Plate }
            )
            .FirstOrDefaultAsync(ct);

        if (job is null)
            return NotFound(new { error = "Job not found." });

        var filePath = _config["WofImport:FilePath"];
        if (string.IsNullOrWhiteSpace(filePath))
            return BadRequest(new { error = "Missing WofImport:FilePath configuration." });

        if (!System.IO.File.Exists(filePath))
            return NotFound(new { error = $"Excel file not found: {filePath}" });

        var sheetName = _config["WofImport:SheetName"];
        var organisationFallback = _config["WofImport:OrganisationName"] ?? "Unknown";
        var sourceFile = Path.GetFileName(filePath);

        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);

        DataTable table;
        await using (var stream = System.IO.File.Open(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
        using (var reader = ExcelReaderFactory.CreateReader(stream))
        {
            var dataSet = reader.AsDataSet(new ExcelDataSetConfiguration
            {
                ConfigureDataTable = _ => new ExcelDataTableConfiguration { UseHeaderRow = true }
            });

            if (!string.IsNullOrWhiteSpace(sheetName))
            {
                if (!dataSet.Tables.Contains(sheetName))
                    return BadRequest(new { error = $"Sheet '{sheetName}' not found." });
                table = dataSet.Tables[sheetName]!;
            }
            else
            {
                if (dataSet.Tables.Count == 0)
                    return BadRequest(new { error = "No worksheet found in the Excel file." });
                table = dataSet.Tables[0];
            }
        }

        var columnMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        for (var i = 0; i < table.Columns.Count; i++)
        {
            var name = NormalizeHeader(table.Columns[i].ColumnName);
            if (!string.IsNullOrWhiteSpace(name) && !columnMap.ContainsKey(name))
                columnMap[name] = i;
        }

        int? colDate = FindColumn(columnMap, "date", "occurredat", "occurred_at", "inspectiondate");
        int? colRego = FindColumn(columnMap, "rego", "registration", "plate", "reg");
        int? colMakeModel = FindColumn(columnMap, "makeandmodel", "makemodel", "make_model", "make&model");
        int? colOdo = FindColumn(columnMap, "odo", "odometer", "kms", "km");
        int? colRecordState = FindColumn(columnMap, "recordstate", "result", "state", "status");
        int? colIsNew = FindColumn(columnMap, "isnewwof", "newwof", "new_wof", "is_new_wof");
        int? colAuthCode = FindColumn(columnMap, "authcode", "auth_code");
        int? colCheckSheet = FindColumn(columnMap, "checksheet", "check_sheet");
        int? colCsNo = FindColumn(columnMap, "csno", "cs_no");
        int? colWofLabel = FindColumn(columnMap, "woflabel", "wof_label");
        int? colLabelNo = FindColumn(columnMap, "labelno", "label_no");
        int? colFailReasons = FindColumn(columnMap, "failreasons", "failreason", "fail_reasons");
        int? colPrevExpiry = FindColumn(columnMap, "previousexpirydate", "previous_expiry_date", "expirydate");
        int? colOrganisation = FindColumn(columnMap, "organisationname", "organizationname", "organisation", "organization");
        int? colNote = FindColumn(columnMap, "note", "notes");
        int? colUiState = FindColumn(columnMap, "uistate", "wofuistate", "wof_ui_state");

        if (colDate is null || colRego is null)
            return BadRequest(new { error = "Missing required columns: Date, Rego." });

        var existing = await _db.JobWofRecords
            .Where(x => x.JobId == id && x.SourceFile == sourceFile)
            .ToListAsync(ct);
        var existingByRow = existing.ToDictionary(x => x.ExcelRowNo);

        var plateKey = NormalizePlate(job.Plate);
        var now = DateTime.UtcNow;
        var inserted = 0;
        var updated = 0;
        var skipped = 0;

        for (var rowIndex = 0; rowIndex < table.Rows.Count; rowIndex++)
        {
            var row = table.Rows[rowIndex];
            var rego = GetString(row, colRego);
            if (string.IsNullOrWhiteSpace(rego))
            {
                skipped++;
                continue;
            }

            if (!string.Equals(NormalizePlate(rego), plateKey, StringComparison.OrdinalIgnoreCase))
                continue;

            var occurredAt = GetDateTime(row, colDate);
            if (occurredAt is null)
            {
                skipped++;
                continue;
            }

            var recordState = ParseRecordState(GetString(row, colRecordState)) ?? WofRecordState.Pass;
            var uiState = ParseUiState(GetString(row, colUiState)) ?? MapUiState(recordState);
            var excelRowNo = rowIndex + 2;

            if (existingByRow.TryGetValue(excelRowNo, out var existingRecord))
            {
                existingRecord.OccurredAt = EnsureUtc(occurredAt.Value);
                existingRecord.Rego = rego.Trim();
                existingRecord.MakeModel = GetString(row, colMakeModel);
                existingRecord.Odo = GetString(row, colOdo);
                existingRecord.RecordState = recordState;
                existingRecord.IsNewWof = GetBool(row, colIsNew);
                existingRecord.AuthCode = GetString(row, colAuthCode);
                existingRecord.CheckSheet = GetString(row, colCheckSheet);
                existingRecord.CsNo = GetString(row, colCsNo);
                existingRecord.WofLabel = GetString(row, colWofLabel);
                existingRecord.LabelNo = GetString(row, colLabelNo);
                existingRecord.FailReasons = GetString(row, colFailReasons);
                existingRecord.PreviousExpiryDate = GetDateOnly(row, colPrevExpiry);
                existingRecord.OrganisationName = GetString(row, colOrganisation) ?? organisationFallback;
                existingRecord.SourceFile = sourceFile;
                existingRecord.Note = GetString(row, colNote);
                existingRecord.WofUiState = uiState;
                existingRecord.UpdatedAt = now;
                updated++;
                continue;
            }

            var record = new JobWofRecord
            {
                JobId = id,
                OccurredAt = EnsureUtc(occurredAt.Value),
                Rego = rego.Trim(),
                MakeModel = GetString(row, colMakeModel),
                Odo = GetString(row, colOdo),
                RecordState = recordState,
                IsNewWof = GetBool(row, colIsNew),
                AuthCode = GetString(row, colAuthCode),
                CheckSheet = GetString(row, colCheckSheet),
                CsNo = GetString(row, colCsNo),
                WofLabel = GetString(row, colWofLabel),
                LabelNo = GetString(row, colLabelNo),
                FailReasons = GetString(row, colFailReasons),
                PreviousExpiryDate = GetDateOnly(row, colPrevExpiry),
                OrganisationName = GetString(row, colOrganisation) ?? organisationFallback,
                ExcelRowNo = excelRowNo,
                SourceFile = sourceFile,
                Note = GetString(row, colNote),
                WofUiState = uiState,
                ImportedAt = now,
                UpdatedAt = now
            };

            _db.JobWofRecords.Add(record);
            inserted++;
        }

        if (inserted > 0 || updated > 0)
            await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            inserted,
            updated,
            skipped,
            sourceFile
        });
    }

    private static string NormalizeHeader(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return "";
        var chars = value.Trim().ToLowerInvariant().Where(char.IsLetterOrDigit).ToArray();
        return new string(chars);
    }

    private static int? FindColumn(IReadOnlyDictionary<string, int> map, params string[] names)
    {
        foreach (var name in names)
        {
            var key = NormalizeHeader(name);
            if (map.TryGetValue(key, out var idx))
                return idx;
        }
        return null;
    }

    private static string? GetString(DataRow row, int? column)
    {
        if (column is null) return null;
        var value = row[column.Value];
        if (value is null || value == DBNull.Value) return null;
        if (value is string s) return string.IsNullOrWhiteSpace(s) ? null : s.Trim();
        if (value is DateTime dt) return dt.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        if (value is double d)
        {
            if (Math.Abs(d % 1) < 0.0000001)
                return ((long)d).ToString(CultureInfo.InvariantCulture);
            return d.ToString(CultureInfo.InvariantCulture);
        }
        return value.ToString()?.Trim();
    }

    private static DateTime? GetDateTime(DataRow row, int? column)
    {
        if (column is null) return null;
        var value = row[column.Value];
        if (value is null || value == DBNull.Value) return null;
        if (value is DateTime dt) return dt;
        if (value is double d) return DateTime.FromOADate(d);
        if (value is string s)
        {
            if (DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out var parsed))
                return parsed;
            if (DateTime.TryParse(s, CultureInfo.CurrentCulture, DateTimeStyles.AssumeLocal, out parsed))
                return parsed;
        }
        return null;
    }

    private static DateOnly? GetDateOnly(DataRow row, int? column)
    {
        var dt = GetDateTime(row, column);
        return dt.HasValue ? DateOnly.FromDateTime(dt.Value) : null;
    }

    private static bool? GetBool(DataRow row, int? column)
    {
        if (column is null) return null;
        var value = row[column.Value];
        if (value is null || value == DBNull.Value) return null;
        if (value is bool b) return b;
        if (value is double d) return Math.Abs(d) > 0.0000001;
        if (value is string s)
        {
            var trimmed = s.Trim().ToLowerInvariant();
            if (trimmed is "true" or "yes" or "y" or "1") return true;
            if (trimmed is "false" or "no" or "n" or "0") return false;
        }
        return null;
    }

    private static WofRecordState? ParseRecordState(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var v = value.Trim().ToLowerInvariant();
        if (v.StartsWith("p")) return WofRecordState.Pass;
        if (v.StartsWith("f")) return WofRecordState.Fail;
        if (v.StartsWith("r")) return WofRecordState.Recheck;
        return null;
    }

    private static WofUiState? ParseUiState(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var v = value.Trim().ToLowerInvariant();
        if (v.StartsWith("p") && !v.StartsWith("pr")) return WofUiState.Pass;
        if (v.StartsWith("f")) return WofUiState.Fail;
        if (v.StartsWith("r")) return WofUiState.Recheck;
        if (v.StartsWith("print")) return WofUiState.Printed;
        return null;
    }

    private static WofUiState MapUiState(WofRecordState state) => state switch
    {
        WofRecordState.Fail => WofUiState.Fail,
        WofRecordState.Recheck => WofUiState.Recheck,
        _ => WofUiState.Pass
    };

    private static string ToRecordStateLabel(WofRecordState state) => state switch
    {
        WofRecordState.Fail => "Fail",
        WofRecordState.Recheck => "Recheck",
        _ => "Pass"
    };

    private static string ToUiStateLabel(WofUiState state) => state switch
    {
        WofUiState.Fail => "Fail",
        WofUiState.Recheck => "Recheck",
        WofUiState.Printed => "Printed",
        _ => "Pass"
    };

    private static string NormalizePlate(string value)
    {
        var chars = value.Trim().ToUpperInvariant().Where(char.IsLetterOrDigit).ToArray();
        return new string(chars);
    }

    private static DateTime EnsureUtc(DateTime value)
    {
        return value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value, DateTimeKind.Utc);
    }

    [HttpPost("{id:long}/wof-server")]
    public async Task<IActionResult> CreateWofRecord(long id, CancellationToken ct)
    {
        return await ImportWofRecords(id, ct);
    }

    [HttpDelete("{id:long}/wof-server")]
    public async Task<IActionResult> DeleteWofServer(long id, CancellationToken ct)
    {
        var deleted = await _db.JobWofRecords
            .Where(x => x.JobId == id)
            .ExecuteDeleteAsync(ct);

        if (deleted == 0)
            return NotFound(new { error = "WOF record not found." });

        return Ok(new { success = true });
    }

    public record CreateWofResultRequest(string Result, string? RecheckExpiryDate, long? FailReasonId, string? Note);

    [HttpPost("{id:long}/wof-results")]
    public async Task<IActionResult> CreateWofResult(long id, [FromBody] CreateWofResultRequest req, CancellationToken ct)
    {
        if (req is null || string.IsNullOrWhiteSpace(req.Result))
            return BadRequest(new { error = "Result is required." });

        var resultValue = req.Result.Trim();
        var recordState = ParseRecordState(resultValue);
        if (recordState is null)
            return BadRequest(new { error = "Result must be Pass, Fail or Recheck." });

        DateOnly? recheckDate = null;
        if (!string.IsNullOrWhiteSpace(req.RecheckExpiryDate))
        {
            if (!DateOnly.TryParse(req.RecheckExpiryDate, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
                return BadRequest(new { error = "Invalid recheck expiry date." });
            recheckDate = parsed;
        }

        var job = await (
                from j in _db.Jobs.AsNoTracking()
                join v in _db.Vehicles.AsNoTracking() on j.VehicleId equals v.Id
                where j.Id == id
                select new { j.Id, Plate = v.Plate }
            )
            .FirstOrDefaultAsync(ct);

        if (job is null)
            return NotFound(new { error = "Job not found." });

        var failReasonId = req.FailReasonId;
        string? failReason = null;
        if (recordState == WofRecordState.Pass)
        {
            failReasonId = null;
            recheckDate = null;
        }
        else if (failReasonId.HasValue)
        {
            failReason = await _db.WofFailReasons.AsNoTracking()
                .Where(x => x.Id == failReasonId.Value)
                .Select(x => x.Label)
                .FirstOrDefaultAsync(ct);
        }

        var now = DateTime.UtcNow;
        var organisationFallback = _config["WofImport:OrganisationName"] ?? "Unknown";

        var record = new JobWofRecord
        {
            JobId = id,
            OccurredAt = now,
            Rego = job.Plate,
            MakeModel = null,
            Odo = null,
            RecordState = recordState.Value,
            IsNewWof = null,
            AuthCode = null,
            CheckSheet = null,
            CsNo = null,
            WofLabel = null,
            LabelNo = null,
            FailReasons = failReason,
            PreviousExpiryDate = recheckDate,
            OrganisationName = organisationFallback,
            ExcelRowNo = 0,
            SourceFile = "manual",
            Note = req.Note ?? "",
            WofUiState = MapUiState(recordState.Value),
            ImportedAt = now,
            UpdatedAt = now
        };

        _db.JobWofRecords.Add(record);
        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            hasWofServer = true,
            record = new
            {
                id = record.Id.ToString(CultureInfo.InvariantCulture),
                wofId = record.JobId.ToString(CultureInfo.InvariantCulture),
                date = record.OccurredAt.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                result = ToRecordStateLabel(record.RecordState),
                recheckExpiryDate = FormatDate(record.PreviousExpiryDate),
                failReasonId,
                failReason,
                note = record.Note ?? "",
                source = record.SourceFile ?? "manual"
            }
        });
    }

    private static string MapStatus(string? status)
    {
        var value = status?.Trim() ?? "";
        if (value.Equals("InProgress", StringComparison.OrdinalIgnoreCase))
            return "In Progress";
        if (value.Equals("Delivered", StringComparison.OrdinalIgnoreCase))
            return "Ready";
        if (value.Equals("Completed", StringComparison.OrdinalIgnoreCase))
            return "Completed";
        if (value.Equals("Archived", StringComparison.OrdinalIgnoreCase))
            return "Archived";
        if (value.Equals("Cancelled", StringComparison.OrdinalIgnoreCase))
            return "Cancelled";
        if (value.Equals("In Progress", StringComparison.OrdinalIgnoreCase))
            return "In Progress";
        return value;
    }

    private static string MapDetailStatus(string? status)
    {
        var value = status?.Trim() ?? "";
        if (value.Equals("InProgress", StringComparison.OrdinalIgnoreCase))
            return "In Shop";
        if (value.Equals("Delivered", StringComparison.OrdinalIgnoreCase))
            return "Ready";
        if (value.Equals("Completed", StringComparison.OrdinalIgnoreCase))
            return "Completed";
        if (value.Equals("Archived", StringComparison.OrdinalIgnoreCase))
            return "Archived";
        if (value.Equals("Cancelled", StringComparison.OrdinalIgnoreCase))
            return "Cancelled";
        if (value.Equals("In Shop", StringComparison.OrdinalIgnoreCase))
            return "In Shop";
        return value;
    }

    private static string BuildVehicleModel(string? make, string? model, int? year)
    {
        var parts = new List<string>(3);
        if (!string.IsNullOrWhiteSpace(make))
            parts.Add(make.Trim());
        if (!string.IsNullOrWhiteSpace(model))
            parts.Add(model.Trim());
        if (year.HasValue)
            parts.Add(year.Value.ToString(CultureInfo.InvariantCulture));

        return parts.Count > 0 ? string.Join(" ", parts) : "Unknown";
    }

    private static string FormatDate(DateOnly? date)
        => date.HasValue ? date.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) : "";

    private static string FormatDateTime(DateTime dateTime)
        => dateTime.ToString("O", CultureInfo.InvariantCulture);
}
