using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Workshop.Api.Migrations
{
    public partial class AddPoSelectionToJobs : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE jobs ADD COLUMN IF NOT EXISTS invoice_reference text;
                ALTER TABLE jobs ADD COLUMN IF NOT EXISTS po_number text;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE jobs DROP COLUMN IF EXISTS invoice_reference;
                ALTER TABLE jobs DROP COLUMN IF EXISTS po_number;
                """);
        }
    }
}
