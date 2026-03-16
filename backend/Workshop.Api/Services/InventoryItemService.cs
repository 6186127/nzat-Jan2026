using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.VisualBasic.FileIO;
using Workshop.Api.Data;
using Workshop.Api.Models;
using Workshop.Api.Options;

namespace Workshop.Api.Services;

public sealed class InventoryItemService
{
    private readonly AppDbContext _db;
    private readonly InventoryItemOptions _options;

    public InventoryItemService(AppDbContext db, IOptions<InventoryItemOptions> options)
    {
        _db = db;
        _options = options.Value;
    }

    public async Task<List<InventoryItemLookupDto>> SearchAsync(string? query, int limit, CancellationToken ct)
    {
        var normalized = query?.Trim();
        var resolvedLimit = Math.Clamp(limit, 1, 50);

        var items = _db.InventoryItems.AsNoTracking()
            .Where(x => string.IsNullOrWhiteSpace(normalized) ||
                        EF.Functions.ILike(x.ItemCode, $"%{normalized}%") ||
                        EF.Functions.ILike(x.ItemName, $"%{normalized}%") ||
                        (x.SalesDescription != null && EF.Functions.ILike(x.SalesDescription, $"%{normalized}%")) ||
                        (x.PurchasesDescription != null && EF.Functions.ILike(x.PurchasesDescription, $"%{normalized}%")));

        return await items
            .OrderBy(x => x.ItemCode)
            .Take(resolvedLimit)
            .Select(x => new InventoryItemLookupDto
            {
                Code = x.ItemCode,
                Name = x.ItemName,
                Description = string.IsNullOrWhiteSpace(x.SalesDescription) ? (x.PurchasesDescription ?? x.ItemName) : x.SalesDescription!,
                UnitPrice = x.SalesUnitPrice ?? x.PurchasesUnitPrice ?? 0m,
                Account = x.SalesAccount ?? x.PurchasesAccount ?? "",
                TaxRate = x.SalesTaxRate ?? x.PurchasesTaxRate ?? "No GST",
                Status = x.Status,
            })
            .ToListAsync(ct);
    }

    public async Task<InventoryItemImportResult> ImportFromConfiguredFileAsync(CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_options.ImportPath))
            return InventoryItemImportResult.Fail("Missing InventoryItems:ImportPath configuration.");

        return await ImportFromFileAsync(_options.ImportPath, ct);
    }

    public async Task EnsureSeededAsync(CancellationToken ct)
    {
        if (await _db.InventoryItems.AsNoTracking().AnyAsync(ct))
            return;

        var importResult = await ImportFromConfiguredFileAsync(ct);
        if (!importResult.Ok && importResult.Error is not null)
            throw new InvalidOperationException(importResult.Error);
    }

    private async Task<InventoryItemImportResult> ImportFromFileAsync(string path, CancellationToken ct)
    {
        if (!File.Exists(path))
            return InventoryItemImportResult.Fail($"Inventory import file not found: {path}");

        var imported = new List<InventoryItem>();

        using var parser = new TextFieldParser(path);
        parser.SetDelimiters(",");
        parser.HasFieldsEnclosedInQuotes = true;

        if (parser.EndOfData)
            return InventoryItemImportResult.Fail("Inventory import file is empty.");

        _ = parser.ReadFields(); // header

        while (!parser.EndOfData)
        {
            ct.ThrowIfCancellationRequested();
            var fields = parser.ReadFields();
            if (fields is null || fields.Length == 0)
                continue;

            var itemCode = GetField(fields, 0)?.Trim();
            if (string.IsNullOrWhiteSpace(itemCode))
                continue;

            imported.Add(new InventoryItem
            {
                ItemCode = itemCode,
                ItemName = GetField(fields, 1)?.Trim() ?? "",
                Quantity = ParseNullableDecimal(GetField(fields, 2)),
                PurchasesDescription = NullIfWhiteSpace(GetField(fields, 3)),
                PurchasesUnitPrice = ParseNullableDecimal(GetField(fields, 4)),
                PurchasesAccount = NullIfWhiteSpace(GetField(fields, 5)),
                PurchasesTaxRate = NullIfWhiteSpace(GetField(fields, 6)),
                SalesDescription = NullIfWhiteSpace(GetField(fields, 7)),
                SalesUnitPrice = ParseNullableDecimal(GetField(fields, 8)),
                SalesAccount = NullIfWhiteSpace(GetField(fields, 9)),
                SalesTaxRate = NullIfWhiteSpace(GetField(fields, 10)),
                InventoryAssetAccount = NullIfWhiteSpace(GetField(fields, 11)),
                CostOfGoodsSoldAccount = NullIfWhiteSpace(GetField(fields, 12)),
                Status = GetField(fields, 13)?.Trim() ?? "",
                InventoryType = NullIfWhiteSpace(GetField(fields, 14)),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
        }

        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        await _db.InventoryItems.ExecuteDeleteAsync(ct);
        await _db.InventoryItems.AddRangeAsync(imported, ct);
        await _db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        return InventoryItemImportResult.Success(imported.Count, path);
    }

    private static string? GetField(string[] fields, int index)
        => index < fields.Length ? fields[index] : null;

    private static decimal? ParseNullableDecimal(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        return decimal.TryParse(value.Trim(), NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : null;
    }

    private static string? NullIfWhiteSpace(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public sealed class InventoryItemLookupDto
{
    public string Code { get; init; } = "";
    public string Name { get; init; } = "";
    public string Description { get; init; } = "";
    public decimal UnitPrice { get; init; }
    public string Account { get; init; } = "";
    public string TaxRate { get; init; } = "No GST";
    public string Status { get; init; } = "";
}

public sealed class InventoryItemImportResult
{
    public bool Ok { get; private init; }
    public int ImportedCount { get; private init; }
    public string? SourcePath { get; private init; }
    public string? Error { get; private init; }

    public static InventoryItemImportResult Success(int importedCount, string sourcePath) =>
        new()
        {
            Ok = true,
            ImportedCount = importedCount,
            SourcePath = sourcePath,
        };

    public static InventoryItemImportResult Fail(string error) =>
        new()
        {
            Ok = false,
            Error = error,
        };
}
