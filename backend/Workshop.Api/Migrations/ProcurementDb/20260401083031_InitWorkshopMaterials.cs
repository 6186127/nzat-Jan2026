using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Workshop.Api.Migrations.ProcurementDb
{
    /// <inheritdoc />
    public partial class InitWorkshopMaterials : Migration
    {
        
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // =========================================================================
            // 👇 终极推土机指令：在建新楼之前，把地上所有可能有冲突的旧表彻底强拆（带 CASCADE 级联删除）
            // =========================================================================
            migrationBuilder.Sql("DROP TABLE IF EXISTS staff_request_items CASCADE;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS restock_order_items CASCADE;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS workshop_materials CASCADE;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS restock_orders CASCADE;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS \"Product\" CASCADE;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS staff_requests CASCADE;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS categories CASCADE;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS suppliers CASCADE;");
            // =========================================================================


            migrationBuilder.CreateTable(
                name: "categories",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: false),
                    parent_id = table.Column<int>(type: "integer", nullable: true),
                    is_tool = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_categories", x => x.id);
                    table.ForeignKey(
                        name: "FK_categories_categories_parent_id",
                        column: x => x.parent_id,
                        principalTable: "categories",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "staff_requests",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    staff_name = table.Column<string>(type: "text", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_staff_requests", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "suppliers",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "text", nullable: false),
                    contact_name = table.Column<string>(type: "text", nullable: true),
                    contact_phone = table.Column<string>(type: "text", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_suppliers", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "Product",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CategoryId = table.Column<int>(type: "integer", nullable: true),
                    SupplierId = table.Column<int>(type: "integer", nullable: true),
                    Name = table.Column<string>(type: "text", nullable: false),
                    ImageUrl = table.Column<string>(type: "text", nullable: true),
                    Specification = table.Column<string>(type: "text", nullable: true),
                    Unit = table.Column<string>(type: "text", nullable: true),
                    CurrentStock = table.Column<int>(type: "integer", nullable: false),
                    MinStockAlert = table.Column<int>(type: "integer", nullable: false),
                    InTransitStock = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Product", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Product_categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "categories",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_Product_suppliers_SupplierId",
                        column: x => x.SupplierId,
                        principalTable: "suppliers",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "restock_orders",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    order_number = table.Column<string>(type: "text", nullable: false),
                    supplier_id = table.Column<int>(type: "integer", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    expected_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_restock_orders", x => x.id);
                    table.ForeignKey(
                        name: "FK_restock_orders_suppliers_supplier_id",
                        column: x => x.supplier_id,
                        principalTable: "suppliers",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "workshop_materials",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    code = table.Column<string>(type: "text", nullable: true),
                    name = table.Column<string>(type: "text", nullable: false),
                    category_id = table.Column<int>(type: "integer", nullable: true),
                    supplier_id = table.Column<int>(type: "integer", nullable: true),
                    image_url = table.Column<string>(type: "text", nullable: true),
                    specification = table.Column<string>(type: "text", nullable: true),
                    unit = table.Column<string>(type: "text", nullable: false),
                    purchase_price = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    current_stock = table.Column<int>(type: "integer", nullable: false),
                    min_stock_alert = table.Column<int>(type: "integer", nullable: false),
                    in_transit_stock = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_workshop_materials", x => x.id);
                    table.ForeignKey(
                        name: "FK_workshop_materials_categories_category_id",
                        column: x => x.category_id,
                        principalTable: "categories",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_workshop_materials_suppliers_supplier_id",
                        column: x => x.supplier_id,
                        principalTable: "suppliers",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "restock_order_items",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    restock_order_id = table.Column<int>(type: "integer", nullable: false),
                    material_id = table.Column<int>(type: "integer", nullable: false),
                    quantity = table.Column<int>(type: "integer", nullable: false),
                    received_quantity = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_restock_order_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_restock_order_items_restock_orders_restock_order_id",
                        column: x => x.restock_order_id,
                        principalTable: "restock_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_restock_order_items_workshop_materials_material_id",
                        column: x => x.material_id,
                        principalTable: "workshop_materials",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "staff_request_items",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    request_id = table.Column<int>(type: "integer", nullable: false),
                    material_id = table.Column<int>(type: "integer", nullable: false),
                    quantity = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_staff_request_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_staff_request_items_staff_requests_request_id",
                        column: x => x.request_id,
                        principalTable: "staff_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_staff_request_items_workshop_materials_material_id",
                        column: x => x.material_id,
                        principalTable: "workshop_materials",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_categories_parent_id",
                table: "categories",
                column: "parent_id");

            migrationBuilder.CreateIndex(
                name: "IX_Product_CategoryId",
                table: "Product",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Product_SupplierId",
                table: "Product",
                column: "SupplierId");

            migrationBuilder.CreateIndex(
                name: "IX_restock_order_items_material_id",
                table: "restock_order_items",
                column: "material_id");

            migrationBuilder.CreateIndex(
                name: "IX_restock_order_items_restock_order_id",
                table: "restock_order_items",
                column: "restock_order_id");

            migrationBuilder.CreateIndex(
                name: "IX_restock_orders_supplier_id",
                table: "restock_orders",
                column: "supplier_id");

            migrationBuilder.CreateIndex(
                name: "IX_staff_request_items_material_id",
                table: "staff_request_items",
                column: "material_id");

            migrationBuilder.CreateIndex(
                name: "IX_staff_request_items_request_id",
                table: "staff_request_items",
                column: "request_id");

            migrationBuilder.CreateIndex(
                name: "IX_workshop_materials_category_id",
                table: "workshop_materials",
                column: "category_id");

            migrationBuilder.CreateIndex(
                name: "IX_workshop_materials_supplier_id",
                table: "workshop_materials",
                column: "supplier_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Product");

            migrationBuilder.DropTable(
                name: "restock_order_items");

            migrationBuilder.DropTable(
                name: "staff_request_items");

            migrationBuilder.DropTable(
                name: "restock_orders");

            migrationBuilder.DropTable(
                name: "staff_requests");

            migrationBuilder.DropTable(
                name: "workshop_materials");

            migrationBuilder.DropTable(
                name: "categories");

            migrationBuilder.DropTable(
                name: "suppliers");
        }
    }
}