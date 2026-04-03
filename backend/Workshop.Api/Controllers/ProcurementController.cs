using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Workshop.Api.Procurement;
using Workshop.Api.Models;
using System.Globalization; 
using CsvHelper;
using CsvHelper.Configuration;
using System.Text;

namespace Workshop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProcurementController : ControllerBase
    {
        private readonly ProcurementDbContext _context;

        public ProcurementController(ProcurementDbContext context)
        {
            _context = context;
        }

        // 技能1：获取所有可用商品列表 (给师傅看)
        [HttpGet("products")]
        public async Task<IActionResult> GetProducts()
        {
            var materials = await _context.WorkshopMaterials
                .Include(p => p.Category)
                .Include(p => p.Supplier)
                .Where(p => p.IsActive)
                .OrderBy(p => p.Id) 
                .Select(p => new {
                    p.Id,
                    p.Code,
                    p.Name,
                    p.Specification,
                    p.Unit,
                    p.CurrentStock,
                    p.MinStockAlert,
                    p.ImageUrl,
                    p.PurchasePrice,
                    CategoryId = p.CategoryId,
                    CategoryName = p.Category != null ? p.Category.Name : "未分类",
                    SupplierId = p.SupplierId,
                    SupplierName = p.Supplier != null ? p.Supplier.Name : "未指定供应商"
                })
                .ToListAsync();

            return Ok(materials);
        }

        // 技能1.5：获取供应商列表 (给下拉框用)
        [HttpGet("suppliers")]
        public async Task<IActionResult> GetSuppliers()
        {
            var suppliers = await _context.Suppliers.ToListAsync();
            return Ok(suppliers);
        }

        // 技能6：手动新建单个物料 (✅ 修复：支持保存分类)
        [HttpPost("products")]
        public async Task<IActionResult> CreateProduct([FromBody] ProductEditDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("物料名称不能为空");

            // 👇 [引入新代码功能]：自动处理分类（如果是前端传来的"工具"，自动建一个工具分类）
            int? categoryId = null;
            if (!string.IsNullOrWhiteSpace(dto.CategoryName))
            {
                var category = await _context.Categories.FirstOrDefaultAsync(c => c.Name == dto.CategoryName);
                if (category == null)
                {
                    category = new Category { Name = dto.CategoryName, IsTool = dto.CategoryName.Contains("工具") };
                    _context.Categories.Add(category);
                    await _context.SaveChangesAsync();
                }
                categoryId = category.Id;
            }
            // 👆 [引入新代码功能结束]

            var newMaterial = new WorkshopMaterial
            {
                Code = dto.Code,
                Name = dto.Name,
                CategoryId = categoryId, // 👈 [引入新代码功能]：✅ 绑定分类
                Specification = dto.Specification,
                Unit = string.IsNullOrWhiteSpace(dto.Unit) ? "个" : dto.Unit,
                CurrentStock = dto.CurrentStock,
                MinStockAlert = dto.MinStockAlert,
                ImageUrl = dto.ImageUrl,
                PurchasePrice = dto.PurchasePrice,
                SupplierId = dto.SupplierId,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.WorkshopMaterials.Add(newMaterial);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "添加成功", Product = newMaterial });
        }

        // 技能7：修改已有的物料信息 (✅ 修复：支持修改分类)
        [HttpPut("products/{id}")]
        public async Task<IActionResult> UpdateProduct(int id, [FromBody] ProductEditDto dto)
        {
            var material = await _context.WorkshopMaterials.FindAsync(id);
            if (material == null) return NotFound("找不到该物料");

            // 👇 [引入新代码功能]：自动处理并更新分类
            int? categoryId = material.CategoryId;
            if (!string.IsNullOrWhiteSpace(dto.CategoryName))
            {
                var category = await _context.Categories.FirstOrDefaultAsync(c => c.Name == dto.CategoryName);
                if (category == null)
                {
                    category = new Category { Name = dto.CategoryName, IsTool = dto.CategoryName.Contains("工具") };
                    _context.Categories.Add(category);
                    await _context.SaveChangesAsync();
                }
                categoryId = category.Id;
            }
            // 👆 [引入新代码功能结束]

            material.Code = dto.Code;
            material.Name = dto.Name;
            material.CategoryId = categoryId; // 👈 [引入新代码功能]：✅ 更新分类
            material.Specification = dto.Specification;
            material.Unit = string.IsNullOrWhiteSpace(dto.Unit) ? "个" : dto.Unit;
            material.CurrentStock = dto.CurrentStock;
            material.MinStockAlert = dto.MinStockAlert;
            material.ImageUrl = dto.ImageUrl;
            material.PurchasePrice = dto.PurchasePrice;
            material.SupplierId = dto.SupplierId;

            await _context.SaveChangesAsync();

            return Ok(new { Message = "修改成功", Product = material });
        }

        // 技能2：接收师傅提交的采购需求单
        [HttpPost("requests")]
        public async Task<IActionResult> SubmitRequest([FromBody] SubmitRequestDto requestDto)
        {
            if (requestDto.Items == null || !requestDto.Items.Any()) return BadRequest("采购车是空的！");

            var newRequest = new StaffRequest
            {
                StaffName = requestDto.StaffName ?? "Workshop 师傅",
                Notes = requestDto.Notes,
                Status = "Pending", 
                CreatedAt = DateTime.UtcNow
            };

            foreach (var item in requestDto.Items)
            {
                newRequest.Items.Add(new StaffRequestItem
                {
                    MaterialId = item.ProductId, 
                    Quantity = item.Quantity
                });
            }

            _context.StaffRequests.Add(newRequest);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "提交成功！", RequestId = newRequest.Id });
        }

        // 技能3：获取所有的采购申请单 (给后台看板用)
        [HttpGet("requests")]
        public async Task<IActionResult> GetRequests()
        {
            var requests = await _context.StaffRequests
                .Include(r => r.Items)
                    .ThenInclude(i => i.Material)
                .OrderByDescending(r => r.CreatedAt) 
                .Select(r => new {
                    r.Id,
                    r.StaffName,
                    r.Notes,
                    r.Status,
                    r.CreatedAt,
                    Items = r.Items.Select(i => new {
                        ProductName = i.Material != null ? i.Material.Name : "未知商品",
                        Specification = i.Material != null ? i.Material.Specification : "",
                        Quantity = i.Quantity
                    })
                })
                .ToListAsync();

            return Ok(requests);
        }

        // 🚀 [核心升级] 技能8：处理单据 (同意并【按供应商自动拆分】补货单 / 驳回彻底删除)
        [HttpPost("requests/{id}/process")]
        public async Task<IActionResult> ProcessRequest(int id, [FromQuery] string action)
        {
            var request = await _context.StaffRequests
                .Include(r => r.Items)
                .ThenInclude(i => i.Material)
                .FirstOrDefaultAsync(r => r.Id == id);
                
            if (request == null) return NotFound("单据不存在");

            if (action == "reject") 
            {
                _context.StaffRequests.Remove(request); 
                await _context.SaveChangesAsync();
                return Ok(new { Message = "单据已彻底删除" });
            }
            else if (action == "approve") 
            {
                request.Status = "Approved"; 

                // 🏗️ 智能拆单逻辑：按商品的供应商(SupplierId)对明细进行分组
                var itemsGroupedBySupplier = request.Items.GroupBy(i => i.Material?.SupplierId);

                int orderCount = 0;
                foreach (var group in itemsGroupedBySupplier)
                {
                    var newOrder = new RestockOrder 
                    {
                        OrderNumber = $"PO-{DateTime.Now:yyyyMMdd}-{new Random().Next(1000, 9999)}", // 换成标准的 PO (Purchase Order)
                        SupplierId = group.Key, // 绑定拆出来的供应商
                        CreatedAt = DateTime.UtcNow,
                        Status = "Sent" 
                    };

                    foreach (var item in group) 
                    {
                        newOrder.Items.Add(new RestockOrderItem 
                        {
                            MaterialId = item.MaterialId,
                            Quantity = item.Quantity,
                            ReceivedQuantity = 0
                        });
                        
                        // 增加在途库存
                        if (item.Material != null) item.Material.InTransitStock += item.Quantity;
                    }

                    _context.RestockOrders.Add(newOrder);
                    orderCount++;
                }

                await _context.SaveChangesAsync();
                return Ok(new { Message = $"已批准！系统已自动拆分为 {orderCount} 张独立的采购单！" });
            }

            return BadRequest("未知的操作");
        }

        // 🚀 [核心升级] 技能9：获取所有的补货单 (附带供应商名称)
        [HttpGet("restock-orders")]
        public async Task<IActionResult> GetRestockOrders()
        {
            var orders = await _context.RestockOrders
                .Include(o => o.Items)
                    .ThenInclude(i => i.Material)
                .Include(o => o.Supplier) // 关联查出供应商
                .OrderByDescending(o => o.CreatedAt)
                .Select(o => new {
                    o.Id,
                    o.OrderNumber,
                    o.Status,
                    o.CreatedAt,
                    o.ExpectedDate,
                    SupplierName = o.Supplier != null ? o.Supplier.Name : "未指定供应商", // 传给前端
                    Items = o.Items.Select(i => new {
                        Id = i.Id,
                        Quantity = i.Quantity,
                        ReceivedQuantity = i.ReceivedQuantity,
                        Product = new { 
                            Name = i.Material != null ? i.Material.Name : "未知商品" 
                        }
                    })
                })
                .ToListAsync();
                
            return Ok(orders);
        }

        // 🚀 [新增] 技能10：分批/精准收货 (支持部分到货)
        [HttpPost("restock-orders/{id}/receive")]
        public async Task<IActionResult> ReceiveRestockOrder(int id, [FromBody] List<ReceiveItemDto> receivedItems)
        {
            var order = await _context.RestockOrders
                .Include(o => o.Items)
                .ThenInclude(i => i.Material)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null) return NotFound("找不到该补货单");
            if (order.Status == "Completed") return BadRequest("该订单已全部入库，请勿重复操作");

            foreach (var dto in receivedItems)
            {
                var item = order.Items.FirstOrDefault(i => i.Id == dto.ItemId);
                if (item != null && dto.Quantity > 0)
                {
                    // 确保不会超量收货（最多收剩下的数量）
                    int actualReceive = Math.Min(dto.Quantity, item.Quantity - item.ReceivedQuantity);
                    
                    item.ReceivedQuantity += actualReceive;
                    
                    if (item.Material != null)
                    {
                        item.Material.CurrentStock += actualReceive; // 增加实际库存
                        item.Material.InTransitStock = Math.Max(0, item.Material.InTransitStock - actualReceive); // 扣除在途
                    }
                }
            }

            // 检查是否所有商品都已经收齐了
            if (order.Items.All(i => i.ReceivedQuantity >= i.Quantity))
            {
                order.Status = "Completed";
            }
            else
            {
                order.Status = "Partially Received"; // 更新为部分收货状态
            }

            await _context.SaveChangesAsync();
            return Ok(new { Message = "收货成功！库存已精准更新。" });
        }

        // 🚀 [新增] 技能11：删除单据 (防死账，退还在途库存)
        [HttpDelete("restock-orders/{id}")]
        public async Task<IActionResult> DeleteRestockOrder(int id)
        {
            var order = await _context.RestockOrders
                .Include(o => o.Items)
                .ThenInclude(i => i.Material)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null) return NotFound("找不到该单据");
            if (order.Status == "Completed") return BadRequest("已入库完结的单据无法删除！");

            // 撤销在途库存
            foreach (var item in order.Items)
            {
                if (item.Material != null)
                {
                    // 减去剩余未收的在途数量
                    item.Material.InTransitStock = Math.Max(0, item.Material.InTransitStock - (item.Quantity - item.ReceivedQuantity));
                }
            }

            _context.RestockOrders.Remove(order);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "补货单已删除，在途库存已成功回退！" });
        }

        // 🚀 [终极升级] 技能4：智能 CSV 导入 (支持更新价格、供应商、避免重复)
        [HttpPost("upload-products")]
        public async Task<IActionResult> UploadProducts(IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest("没有检测到文件，请上传 CSV 文件。");

            using var reader = new StreamReader(file.OpenReadStream(), true);
            var csvConfig = new CsvConfiguration(CultureInfo.InvariantCulture) 
            { 
                HasHeaderRecord = true, TrimOptions = TrimOptions.Trim, 
                MissingFieldFound = null, HeaderValidated = null 
            };
            using var csv = new CsvReader(reader, csvConfig);

            var records = csv.GetRecords<ProductCsvRecord>().ToList();
            if (!records.Any()) return BadRequest("CSV 文件里没有读到任何数据。");

            int updatedCount = 0; 
            int addedCount = 0; 
            var existingCategories = await _context.Categories.ToDictionaryAsync(c => c.Name);
            var existingSuppliers = await _context.Suppliers.ToDictionaryAsync(s => s.Name); 

            foreach (var record in records) 
            {
                if (string.IsNullOrWhiteSpace(record.Name)) continue; 
                
                Category? category = null;
                if (!string.IsNullOrWhiteSpace(record.CategoryName)) 
                {
                    if (!existingCategories.TryGetValue(record.CategoryName, out category)) 
                    {
                        // 👇 [引入新代码功能]：动态判断是否包含“工具”字样
                        category = new Category { Name = record.CategoryName, IsTool = record.CategoryName.Contains("工具") };
                        // 👆 [引入新代码功能结束]
                        _context.Categories.Add(category); 
                        await _context.SaveChangesAsync(); 
                        existingCategories[record.CategoryName] = category; 
                    }
                }

                Supplier? supplier = null;
                if (!string.IsNullOrWhiteSpace(record.SupplierName))
                {
                    if (!existingSuppliers.TryGetValue(record.SupplierName, out supplier))
                    {
                        supplier = new Supplier { Name = record.SupplierName };
                        _context.Suppliers.Add(supplier); 
                        await _context.SaveChangesAsync();
                        existingSuppliers[record.SupplierName] = supplier;
                    }
                }
                
                var existingMaterial = await _context.WorkshopMaterials
                    .FirstOrDefaultAsync(m => 
                        (!string.IsNullOrEmpty(record.Code) && m.Code == record.Code) || 
                        (m.Name == record.Name));

                if (existingMaterial != null)
                {
                    existingMaterial.Code = string.IsNullOrWhiteSpace(record.Code) ? existingMaterial.Code : record.Code;
                    if (category != null) existingMaterial.CategoryId = category.Id;
                    if (supplier != null) existingMaterial.SupplierId = supplier.Id;
                    existingMaterial.Specification = string.IsNullOrWhiteSpace(record.Specification) ? existingMaterial.Specification : record.Specification;
                    if (record.PurchasePrice.HasValue) existingMaterial.PurchasePrice = record.PurchasePrice.Value;
                    if (!string.IsNullOrWhiteSpace(record.Unit)) existingMaterial.Unit = record.Unit;
                    if (record.CurrentStock.HasValue) existingMaterial.CurrentStock = record.CurrentStock.Value;
                    if (record.MinStockAlert.HasValue) existingMaterial.MinStockAlert = record.MinStockAlert.Value;
                    
                    updatedCount++;
                }
                else
                {
                    var newMaterial = new WorkshopMaterial 
                    {
                        Name = record.Name, 
                        Code = record.Code,
                        CategoryId = category?.Id, 
                        SupplierId = supplier?.Id,
                        Specification = record.Specification,
                        PurchasePrice = record.PurchasePrice ?? 0,
                        Unit = string.IsNullOrWhiteSpace(record.Unit) ? "个" : record.Unit, 
                        CurrentStock = record.CurrentStock ?? 0,
                        MinStockAlert = record.MinStockAlert ?? 0, 
                        IsActive = true, 
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.WorkshopMaterials.Add(newMaterial); 
                    addedCount++;
                }
            }
            
            await _context.SaveChangesAsync();
            return Ok(new { Message = $"导入完毕！\n新增了 {addedCount} 条物料\n更新了 {updatedCount} 条现有物料！" });
        }

        // 技能5：删除指定的物料
        [HttpDelete("products/{id}")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            var material = await _context.WorkshopMaterials.FindAsync(id);
            if (material == null) return NotFound("找不到该物料");
            
            _context.WorkshopMaterials.Remove(material);
            await _context.SaveChangesAsync();
            
            return Ok(new { Message = "删除成功！" });
        }

        // ==========================================
        // 🔥 王炸功能 1：智能推荐采购 (Smart Restock)
        // ==========================================
        
        // 技能12：扫描并获取所有快断货的商品建议
        [HttpGet("smart-restock")]
        public async Task<IActionResult> GetSmartRestockRecommendations()
        {
            // 👇 [引入新代码功能]：引入Category，且工具不参与低库存报警计算
            var shortages = await _context.WorkshopMaterials
                .Include(m => m.Supplier)
                .Include(m => m.Category)
                .Where(m => m.IsActive 
                         && (m.Category == null || !m.Category.Name.Contains("工具")) 
                         && (m.CurrentStock + m.InTransitStock < m.MinStockAlert))
            // 👆 [引入新代码功能结束]
                .Select(m => new {
                    ProductId = m.Id,
                    m.Name,
                    m.Specification,
                    m.CurrentStock,
                    m.InTransitStock,
                    m.MinStockAlert,
                    SupplierName = m.Supplier != null ? m.Supplier.Name : "未指定供应商",
                    // 默认建议补货量：补齐到警戒线，外加一小部分余量（可根据实际情况调整算法）
                    SuggestedQuantity = (m.MinStockAlert - (m.CurrentStock + m.InTransitStock)) > 0 
                        ? (m.MinStockAlert - (m.CurrentStock + m.InTransitStock)) + 5 
                        : 0
                })
                .ToListAsync();

            return Ok(shortages);
        }

        // 技能13：一键将智能推荐转化为待办申请单
        [HttpPost("smart-restock/apply")]
        public async Task<IActionResult> ApplySmartRestock([FromBody] List<SubmitRequestItemDto> items)
        {
            if (items == null || !items.Any()) return BadRequest("没有传入需要补货的商品");

            var newRequest = new StaffRequest
            {
                StaffName = "🤖 智能助手 (Smart Restock)",
                Notes = "系统自动扫描低库存生成的补货申请，请老板审批生成 PO 单",
                Status = "Pending", 
                CreatedAt = DateTime.UtcNow
            };

            foreach (var item in items)
            {
                newRequest.Items.Add(new StaffRequestItem
                {
                    MaterialId = item.ProductId, 
                    Quantity = item.Quantity
                });
            }

            _context.StaffRequests.Add(newRequest);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "一键智能采购申请已生成！快去看板点击同意吧！", RequestId = newRequest.Id });
        }

        // ==========================================
        // 🔥 王炸功能 2：采购单微信一键分享 (后端支持)
        // ==========================================

        // 技能14：把 PO 单排版成漂亮的纯文本，供前端“一键复制”发给供应商
        [HttpGet("restock-orders/{id}/wechat-format")]
        public async Task<IActionResult> GetWeChatShareText(int id)
        {
            var order = await _context.RestockOrders
                .Include(o => o.Items).ThenInclude(i => i.Material)
                .Include(o => o.Supplier)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null) return NotFound("找不到该订单");

            var sb = new StringBuilder();
            sb.AppendLine($"📦 【采购订单】 {order.OrderNumber}");
            sb.AppendLine($"🏢 供应商: {(order.Supplier != null ? order.Supplier.Name : "暂未指定")}");
            sb.AppendLine($"📅 日期: {order.CreatedAt:yyyy-MM-dd}");
            sb.AppendLine(new string('-', 20)); // 分割线
            
            foreach (var item in order.Items)
            {
                var materialName = item.Material != null ? item.Material.Name : "未知商品";
                var spec = item.Material != null && !string.IsNullOrWhiteSpace(item.Material.Specification) 
                    ? $" ({item.Material.Specification})" 
                    : "";
                var unit = item.Material != null && !string.IsNullOrWhiteSpace(item.Material.Unit) 
                    ? item.Material.Unit 
                    : "件";

                sb.AppendLine($"▪ {materialName}{spec} x {item.Quantity} {unit}");
            }
            
            sb.AppendLine(new string('-', 20));
            sb.AppendLine("老板好，以上是最新订单，麻烦确认一下排期发货，谢谢！");

            // 返回格式化好的文本，前端直接调 Clipboard API 复制
            return Ok(new { Text = sb.ToString() });
        }
    }

    // ================= DTOs (数据传输对象) =================

    public class SubmitRequestDto 
    { 
        public string? StaffName { get; set; } 
        public string? Notes { get; set; } 
        public List<SubmitRequestItemDto> Items { get; set; } = new List<SubmitRequestItemDto>(); 
    }

    public class SubmitRequestItemDto 
    { 
        public int ProductId { get; set; } 
        public int Quantity { get; set; } 
    }

    public class ReceiveItemDto
    {
        public int ItemId { get; set; } 
        public int Quantity { get; set; } 
    }

    public class ProductCsvRecord 
    { 
        public string Name { get; set; } = string.Empty; 
        public string? Code { get; set; } 
        public string? CategoryName { get; set; } 
        public string? Specification { get; set; } 
        public string? SupplierName { get; set; } 
        public decimal? PurchasePrice { get; set; } 
        public string? Unit { get; set; } 
        public int? CurrentStock { get; set; } 
        public int? MinStockAlert { get; set; } 
    }

    public class ProductEditDto 
    { 
        public string? Code { get; set; } 
        public string Name { get; set; } = ""; 
        public string? CategoryName { get; set; } // 👈 [引入新代码功能]：✅ 修复：必须有这个字段，否则后端不知道是工具还是耗材
        public string? Specification { get; set; } 
        public string? Unit { get; set; } 
        public int CurrentStock { get; set; } 
        public int MinStockAlert { get; set; } 
        public string? ImageUrl { get; set; } 
        public decimal PurchasePrice { get; set; } 
        public int? SupplierId { get; set; } 
    }
}