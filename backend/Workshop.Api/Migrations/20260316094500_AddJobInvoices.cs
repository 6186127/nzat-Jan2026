using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Workshop.Api.Migrations
{
    public partial class AddJobInvoices : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "job_invoices",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    job_id = table.Column<long>(type: "bigint", nullable: false),
                    provider = table.Column<string>(type: "text", nullable: false),
                    external_invoice_id = table.Column<string>(type: "text", nullable: true),
                    external_invoice_number = table.Column<string>(type: "text", nullable: true),
                    external_status = table.Column<string>(type: "text", nullable: true),
                    reference = table.Column<string>(type: "text", nullable: true),
                    contact_name = table.Column<string>(type: "text", nullable: true),
                    invoice_date = table.Column<DateOnly>(type: "date", nullable: true),
                    line_amount_types = table.Column<string>(type: "text", nullable: false),
                    tenant_id = table.Column<string>(type: "text", nullable: true),
                    request_payload_json = table.Column<string>(type: "text", nullable: true),
                    response_payload_json = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "date_trunc('milliseconds', now())"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "date_trunc('milliseconds', now())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_job_invoices", x => x.id);
                    table.ForeignKey(
                        name: "FK_job_invoices_jobs_job_id",
                        column: x => x.job_id,
                        principalTable: "jobs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ux_job_invoices_job_id",
                table: "job_invoices",
                column: "job_id",
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "job_invoices");
        }
    }
}
