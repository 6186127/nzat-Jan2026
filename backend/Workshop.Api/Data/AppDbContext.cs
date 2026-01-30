using Microsoft.EntityFrameworkCore;
using Workshop.Api.Models;

namespace Workshop.Api.Data;

public class AppDbContext : DbContext
{
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Job> Jobs => Set<Job>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<JobTag> JobTags => Set<JobTag>();

    //wof_service
    public DbSet<WofService> WofServices => Set<WofService>();
    public DbSet<WofCheckItem> WofCheckItems => Set<WofCheckItem>();
    public DbSet<WofResult> WofResults => Set<WofResult>();
    public DbSet<WofFailReason> WofFailReasons => Set<WofFailReason>();
    

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var e = modelBuilder.Entity<Vehicle>();
        e.ToTable("vehicles");

        e.HasKey(x => x.Id);

        e.Property(x => x.Id).HasColumnName("id").ValueGeneratedOnAdd();
        e.Property(x => x.Plate).HasColumnName("plate").IsRequired();
        e.HasIndex(x => x.Plate).IsUnique();

        e.Property(x => x.Make).HasColumnName("make");
        e.Property(x => x.Model).HasColumnName("model");
        e.Property(x => x.Year).HasColumnName("year");
        e.Property(x => x.Vin).HasColumnName("vin");
        e.Property(x => x.Engine).HasColumnName("engine");
        e.Property(x => x.RegoExpiry).HasColumnName("rego_expiry");
        e.Property(x => x.Colour).HasColumnName("colour");
        e.Property(x => x.BodyStyle).HasColumnName("body_style");
        e.Property(x => x.EngineNo).HasColumnName("engine_no");
        e.Property(x => x.Chassis).HasColumnName("chassis");
        e.Property(x => x.CcRating).HasColumnName("cc_rating");
        e.Property(x => x.FuelType).HasColumnName("fuel_type");
        e.Property(x => x.Seats).HasColumnName("seats");
        e.Property(x => x.CountryOfOrigin).HasColumnName("country_of_origin");
        e.Property(x => x.GrossVehicleMass).HasColumnName("gross_vehicle_mass");
        e.Property(x => x.Refrigerant).HasColumnName("refrigerant");
        e.Property(x => x.FuelTankCapacityLitres).HasColumnName("fuel_tank_capacity_litres");
        e.Property(x => x.FullCombinedRangeKm).HasColumnName("full_combined_range_km");
        e.Property(x => x.WofExpiry).HasColumnName("wof_expiry");
        e.Property(x => x.Odometer).HasColumnName("odometer");
        e.Property(x => x.NzFirstRegistration).HasColumnName("nz_first_registration");
        e.Property(x => x.CustomerId).HasColumnName("customer_id");

        // ✅ raw_json jsonb
        e.Property(x => x.RawJson).HasColumnName("raw_json").HasColumnType("jsonb");

        e.Property(x => x.UpdatedAt)
            .HasColumnName("updated_at")
            .HasDefaultValueSql("now()");

        var c = modelBuilder.Entity<Customer>();
        c.ToTable("customers");
        c.HasKey(x => x.Id);
        c.Property(x => x.Id).HasColumnName("id").ValueGeneratedOnAdd();
        c.Property(x => x.Type).HasColumnName("type").IsRequired();
        c.Property(x => x.Name).HasColumnName("name").IsRequired();
        c.Property(x => x.Phone).HasColumnName("phone");
        c.Property(x => x.Email).HasColumnName("email");
        c.Property(x => x.Address).HasColumnName("address");
        c.Property(x => x.BusinessCode).HasColumnName("business_code");
        c.Property(x => x.Notes).HasColumnName("notes");

        var j = modelBuilder.Entity<Job>();
        j.ToTable("jobs");
        j.HasKey(x => x.Id);
        j.Property(x => x.Id).HasColumnName("id").ValueGeneratedOnAdd();
        j.Property(x => x.Status).HasColumnName("status").IsRequired();
        j.Property(x => x.IsUrgent).HasColumnName("is_urgent");
        j.Property(x => x.VehicleId).HasColumnName("vehicle_id");
        j.Property(x => x.CustomerId).HasColumnName("customer_id");
        j.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
        j.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");

        var t = modelBuilder.Entity<Tag>();
        t.ToTable("tags");
        t.HasKey(x => x.Id);
        t.Property(x => x.Id).HasColumnName("id").ValueGeneratedOnAdd();
        t.Property(x => x.Name).HasColumnName("name").IsRequired();
        t.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true);
        t.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
        t.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");

        var jt = modelBuilder.Entity<JobTag>();
        jt.ToTable("job_tags");
        jt.HasKey(x => new { x.JobId, x.TagId });
        jt.Property(x => x.JobId).HasColumnName("job_id").IsRequired();
        jt.Property(x => x.TagId).HasColumnName("tag_id").IsRequired();
        jt.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

        var w = modelBuilder.Entity<WofService>();
        w.ToTable("wof_service");
        w.HasKey(x => x.Id);
        w.Property(x => x.Id).HasColumnName("id").ValueGeneratedOnAdd();
        w.Property(x => x.JobId).HasColumnName("job_id").IsRequired();
        w.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
        w.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");

        var wci = modelBuilder.Entity<WofCheckItem>();
        wci.ToTable("wof_check_items");
        wci.HasKey(x => x.Id);
        wci.Property(x => x.Id).HasColumnName("id").ValueGeneratedOnAdd();
        wci.Property(x => x.WofId).HasColumnName("wof_id").IsRequired();
        wci.Property(x => x.Odo).HasColumnName("odo");
        wci.Property(x => x.AuthCode).HasColumnName("auth_code");
        wci.Property(x => x.CheckSheet).HasColumnName("check_sheet");
        wci.Property(x => x.CsNo).HasColumnName("cs_no");
        wci.Property(x => x.WofLabel).HasColumnName("wof_label");
        wci.Property(x => x.LabelNo).HasColumnName("label_no");
        wci.Property(x => x.Source).HasColumnName("source");
        wci.Property(x => x.SourceRow).HasColumnName("source_row");
        wci.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");

        var wr = modelBuilder.Entity<WofResult>();
        wr.ToTable("wof_results");
        wr.HasKey(x => x.Id);
        wr.Property(x => x.Id).HasColumnName("id").ValueGeneratedOnAdd();
        wr.Property(x => x.WofId).HasColumnName("wof_id").IsRequired();
        wr.Property(x => x.Result).HasColumnName("result").IsRequired();
        wr.Property(x => x.RecheckExpiryDate).HasColumnName("recheck_expiry_date");
        wr.Property(x => x.FailReasonId).HasColumnName("fail_reason_id");
        wr.Property(x => x.Note).HasColumnName("note");
        wr.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");

        var wfr = modelBuilder.Entity<WofFailReason>();
        wfr.ToTable("wof_fail_reasons");
        wfr.HasKey(x => x.Id);
        wfr.Property(x => x.Id).HasColumnName("id").ValueGeneratedOnAdd();
        wfr.Property(x => x.Label).HasColumnName("label").IsRequired();
        wfr.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true);
        wfr.Property(x => x.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
        wfr.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");
    }
}
