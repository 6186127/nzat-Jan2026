using Microsoft.EntityFrameworkCore;
using CarjamImporter;
using CarjamImporter.Infrastructure;
using CarjamImporter.Persistence;
using CarjamImporter.Playwright;
using Workshop.Api.Data;
using Workshop.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddControllers();

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

// ========= Carjam Importer DI =========

// 1) Connection string (prefer "Carjam", fallback to "Default")
var carjamConnStr =
    builder.Configuration.GetConnectionString("Carjam")
    ?? builder.Configuration.GetConnectionString("Default");

if (string.IsNullOrWhiteSpace(carjamConnStr))
    throw new InvalidOperationException("Missing connection string. Set ConnectionStrings:Carjam (or Default) in appsettings.json.");

// 2) Register infrastructure/repo dependencies
builder.Services.AddSingleton(new DbConnectionFactory(carjamConnStr));
builder.Services.AddScoped<VehicleRepository>();

// 3) Register browser + import service
builder.Services.AddScoped<CarjamBrowser>();
builder.Services.AddScoped<CarjamImportService>();

// (Optional) If you still use your own scraper in Workshop.Api
builder.Services.AddScoped<CarjamScraper>();

// ========= Build pipeline =========
var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.MapControllers();

app.Run();
