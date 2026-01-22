import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, Input, Select, Button } from "@/components/ui";
import { StatusPill, ProgressRing, TagsCell } from "@/components/jobs";
import { Search, Archive, Trash2, RotateCcw, ChevronDown, Plus } from "lucide-react"; import { MultiTagSelect, type TagOption } from "../../components/MultiTagSelect";
import type { JobsFilters, JobRow, JobStatus } from "@/types/JobType";
import { filterJobs, sortSelected, paginate } from "@/utils/jobs.utils";
import { useEffect } from "react";



const gridCols =
    // <640：超紧凑（隐藏 电话 + 创建时间 + JOB ID）
    "grid-cols-[30px_80px_100px_70px_160px_60px_60px_60px_80px_64px] " +

    // ≥640 (sm)：显示 JOB ID
    "sm:grid-cols-[30px_90px_110px_120px_80px_180px_64px_64px_64px_100px_64px] " +

    // ≥768 (md)：显示完整标签列
    "md:grid-cols-[30px_100px_100px_130px_70px_130px_65px_65px_65px_80px_64px] " +

    // ≥1024 (lg)：显示客户电话
    "lg:grid-cols-[30px_100px_100px_130px_70px_130px_65px_65px_65px_80px_80px_64px] " +

    // ≥1440：完整显示所有字段（包括创建时间）
    "1440:grid-cols-[30px_120px_120px_160px_70px_130px_65px_65px_65px_80px_100px_150px_50px]";

const tagOptions: TagOption[] = [
    { id: "badge", label: "Badge" },
    { id: "vip", label: "VIP" },
    { id: "urgent", label: "Urgent" },
    { id: "parts", label: "Parts" },
    { id: "repeat", label: "Repeat" },
];


const mockRows: JobRow[] = [
    {
        id: "J-20251206",
        vehicleStatus: "In Progress",
        selectedTags: ["Badge", "VIP", "Urgent", "Parts"],
        plate: "XYZ789",
        vehicleModel: "Toyota Corolla 2018",
        wofPct: 23,
        mechPct: 58,
        paintPct: 68,
        customerName: "王伟",
        customerPhone: "0218796689",
        createdAt: "2025/12/06 10:55",
    },
    {
        id: "J-20251206-2",
        vehicleStatus: "Ready",
        selectedTags: ["Repeat"],
        plate: "CCTV001",
        vehicleModel: "Toyota Corolla 2018",
        wofPct: 100,
        mechPct: null,
        paintPct: null,
        customerName: "王伟",
        customerPhone: "0218796689",
        createdAt: "2026/01/20",
    },
    {
        id: "J-20251206-3",
        vehicleStatus: "Cancelled",
        selectedTags: [],
        plate: "CCTV001",
        vehicleModel: "Toyota Corolla 2018",
        wofPct: 0,
        mechPct: null,
        paintPct: null,
        customerName: "王伟",
        customerPhone: "0218796689",
        createdAt: "2026/01/06",
    },
    {
        id: "J-20251207",
        vehicleStatus: "In Progress",
        selectedTags: ["VIP"],
        plate: "ABC123",
        vehicleModel: "Honda Civic 2020",
        wofPct: 45,
        mechPct: 30,
        paintPct: 50,
        customerName: "李明",
        customerPhone: "0229876543",
        createdAt: "2025/12/07 14:20",
    },
    {
        id: "J-20251208",
        vehicleStatus: "Completed",
        selectedTags: ["Badge", "Parts"],
        plate: "DEF456",
        vehicleModel: "Mazda 3 2019",
        wofPct: 100,
        mechPct: 100,
        paintPct: 100,
        customerName: "张三",
        customerPhone: "0218765432",
        createdAt: "2025/12/08 09:15",
    },
    {
        id: "J-20251209",
        vehicleStatus: "Pending",
        selectedTags: ["Urgent"],
        plate: "GHI789",
        vehicleModel: "Nissan Altima 2021",
        wofPct: 0,
        mechPct: 0,
        paintPct: 0,
        customerName: "王芳",
        customerPhone: "0219876543",
        createdAt: "2025/12/09 16:45",
    },
    {
        id: "J-20251210",
        vehicleStatus: "Ready",
        selectedTags: ["Repeat", "VIP"],
        plate: "JKL012",
        vehicleModel: "Toyota Prius 2018",
        wofPct: 100,
        mechPct: 85,
        paintPct: 90,
        customerName: "刘强",
        customerPhone: "0218654321",
        createdAt: "2025/12/10 11:30",
    },
    {
        id: "J-20251211",
        vehicleStatus: "In Progress",
        selectedTags: ["Badge"],
        plate: "MNO345",
        vehicleModel: "BMW X5 2020",
        wofPct: 60,
        mechPct: 40,
        paintPct: 70,
        customerName: "陈婷",
        customerPhone: "0229654321",
        createdAt: "2025/12/11 13:00",
    },
    {
        id: "J-20251212",
        vehicleStatus: "Archived",
        selectedTags: [],
        plate: "PQR678",
        vehicleModel: "Audi A4 2019",
        wofPct: 100,
        mechPct: 100,
        paintPct: 100,
        customerName: "周杰",
        customerPhone: "0218543210",
        createdAt: "2025/12/12 08:20",
    },
    {
        id: "J-20251213",
        vehicleStatus: "Cancelled",
        selectedTags: ["Parts"],
        plate: "STU901",
        vehicleModel: "Mercedes-Benz C-Class 2021",
        wofPct: 20,
        mechPct: 15,
        paintPct: 10,
        customerName: "吴美",
        customerPhone: "0219543210",
        createdAt: "2025/12/13 10:45",
    },
    {
        id: "J-20251214",
        vehicleStatus: "In Progress",
        selectedTags: ["VIP", "Urgent"],
        plate: "VWX234",
        vehicleModel: "Subaru Outback 2020",
        wofPct: 55,
        mechPct: 65,
        paintPct: 45,
        customerName: "徐磊",
        customerPhone: "0218432109",
        createdAt: "2025/12/14 15:15",
    },
    {
        id: "J-20251215",
        vehicleStatus: "Ready",
        selectedTags: ["Badge", "Repeat"],
        plate: "YZA567",
        vehicleModel: "Hyundai Elantra 2019",
        wofPct: 100,
        mechPct: 95,
        paintPct: 100,
        customerName: "黄强",
        customerPhone: "0229432109",
        createdAt: "2025/12/15 12:30",
    },
    {
        id: "J-20251216",
        vehicleStatus: "Completed",
        selectedTags: ["VIP"],
        plate: "BCD890",
        vehicleModel: "Kia Optima 2020",
        wofPct: 100,
        mechPct: 100,
        paintPct: 100,
        customerName: "赵敏",
        customerPhone: "0218321098",
        createdAt: "2025/12/16 09:50",
    },
    {
        id: "J-20251217",
        vehicleStatus: "Pending",
        selectedTags: ["Urgent"],
        plate: "EFG123",
        vehicleModel: "Volkswagen Golf 2021",
        wofPct: 10,
        mechPct: 5,
        paintPct: 0,
        customerName: "孙芳",
        customerPhone: "0219321098",
        createdAt: "2025/12/17 14:25",
    },
    {
        id: "J-20251218",
        vehicleStatus: "In Progress",
        selectedTags: ["Badge", "Parts", "VIP"],
        plate: "HIJ456",
        vehicleModel: "Lexus ES 2020",
        wofPct: 75,
        mechPct: 80,
        paintPct: 85,
        customerName: "周冰",
        customerPhone: "0218210987",
        createdAt: "2025/12/18 11:10",
    },
    {
        id: "J-20251219",
        vehicleStatus: "Ready",
        selectedTags: ["Repeat"],
        plate: "KLM789",
        vehicleModel: "Volvo XC90 2019",
        wofPct: 100,
        mechPct: 90,
        paintPct: 95,
        customerName: "吕超",
        customerPhone: "0229210987",
        createdAt: "2025/12/19 16:40",
    },
    {
        id: "J-20251220",
        vehicleStatus: "Completed",
        selectedTags: ["Badge"],
        plate: "NOP012",
        vehicleModel: "Tesla Model 3 2021",
        wofPct: 100,
        mechPct: 100,
        paintPct: 100,
        customerName: "朱琳",
        customerPhone: "0218109876",
        createdAt: "2025/12/20 13:35",
    },
];



export function JobsPage() {
    const [jobType, setJobType] = useState("");
    const [timeRange, setTimeRange] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [customer, setCustomer] = useState("");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 6;
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    
    const filters = useMemo<JobsFilters>(() => ({
        search,
        jobType: (jobType as any) || "",
        timeRange: (timeRange as any) || "",
        startDate,
        endDate,
        customer,
        selectedTags,
    }), [search, jobType, timeRange, startDate, endDate, customer, selectedTags]);

    const rows = useMemo(() => {
        const filtered = filterJobs(mockRows, filters);
        return sortSelected(filtered, selectedIds);
    }, [filters, selectedIds]);


    //pageination
    const { pageRows: paginatedRows, totalPages } = useMemo(
        () => paginate(rows, currentPage, pageSize),
        [rows, currentPage, pageSize]
    );
        useEffect(() => {
  setCurrentPage(1);
}, [filters]);



    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    return (

        <div className="space-y-4 text-[14px]">

            <h1 className="text-2xl font-semibold text-[rgba(0,0,0,0.72)]">Jobs</h1>

            <Card>
                {/* Filter Header - Collapsible */}
                <div
                    className="flex items-c-enter justify-between px-4 py-3 cursor-pointer hover:bg-[rgba(0,0,0,0.02)] transition"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                >
                    <h2 className="font-semibold text-[rgba(0,0,0,0.72)]">筛选条件</h2>
                    <ChevronDown
                        size={20}
                        className={`text-[rgba(0,0,0,0.55)] transition-transform ${isFilterOpen ? "rotate-180" : ""}`}
                    />
                </div>

                {/* Filter Content - Collapsible */}
                {isFilterOpen && (
                    <>
                        <div className="border-t border-[rgba(0,0,0,0.06)]"></div>
                        <div className="p-4">
                            <div className="grid grid-cols-12 gap-4 items-end">
                                <div className="col-span-12 md:col-span-3 lg:col-span-3">
                                    <div className="text-xs text-[rgba(0,0,0,0.55)] mb-1">Job Type</div>
                                    <Select value={jobType} onChange={(e) => setJobType(e.target.value)}>
                                        <option value="">全部</option>
                                        <option value="In Progress">进行中</option>
                                        <option value="Completed">已完成</option>
                                        <option value="Ready">可交车</option>
                                        <option value="Archived">归档</option>
                                        <option value="Cancelled">取消</option>
                                    </Select>
                                </div>

                                <div className="col-span-12 md:col-span-3 lg:col-span-3">
                                    <div className="text-xs text-[rgba(0,0,0,0.55)] mb-1">时间</div>
                                    <Select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
                                        <option value="">全部</option>
                                        <option value="week">本周</option>
                                        <option value="lastWeek">上周</option>
                                        <option value="month">本月</option>
                                        <option value="custom">自定义</option>
                                    </Select>
                                </div>

                                {timeRange === "custom" && (
                                    <>
                                        <div className="col-span-12 md:col-span-3 lg:col-span-3">
                                            <div className="text-xs text-[rgba(0,0,0,0.55)] mb-1">开始日期</div>
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="h-9 w-full rounded-[8px] border border-[rgba(0,0,0,0.10)] bg-white px-3 text-sm outline-none focus:border-[rgba(37,99,235,0.45)] focus:ring-2 focus:ring-[rgba(37,99,235,0.12)]"
                                            />
                                        </div>
                                        <div className="col-span-12 md:col-span-3 lg:col-span-3">
                                            <div className="text-xs text-[rgba(0,0,0,0.55)] mb-1">结束日期</div>
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="h-9 w-full rounded-[8px] border border-[rgba(0,0,0,0.10)] bg-white px-3 text-sm outline-none focus:border-[rgba(37,99,235,0.45)] focus:ring-2 focus:ring-[rgba(37,99,235,0.12)]"
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="col-span-12 md:col-span-3 lg:col-span-3">
                                    <div className="text-xs text-[rgba(0,0,0,0.55)] mb-1">客户</div>
                                    <Input value={customer} onChange={(e) => setCustomer(e.target.value)} />
                                </div>

                                <div className="col-span-12 md:col-span-3 lg:col-span-3">
                                    <div className="text-xs text-[rgba(0,0,0,0.55)] mb-1">Tag</div>
                                    <MultiTagSelect
                                        options={tagOptions}
                                        value={selectedTags}
                                        onChange={setSelectedTags}
                                        placeholder="Select tags"
                                        maxChips={2}
                                    />
                                </div>

                                <div className="col-span-12 md:col-span-6 lg:col-span-3">
                                    <div className="text-xs text-[rgba(0,0,0,0.55)] mb-1">搜索</div>
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(0,0,0,0.40)]" />
                                        <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                                    </div>
                                </div>

                                <div className="col-span-12 lg:col-start-10 lg:col-end-13 flex justify-end gap-3">
                                    <Button
                                        onClick={() => {
                                            setJobType("");
                                            setTimeRange("");
                                            setCustomer("");
                                            setSelectedTags([]);
                                            setSearch("");
                                        }}
                                        leftIcon={<RotateCcw size={16} />}
                                    >
                                        Reset
                                    </Button>

                                </div>
                            </div>
                        </div>
                    </>
                )}
            </Card>

            <div className="flex justify-end">
                <Link to="/jobs/new">
                    <Button variant="primary" leftIcon={<Plus size={16} />}>
                        Add New Job
                    </Button>
                </Link>
            </div>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    {/* min width makes horizontal scroll kick in instead of squishing */}
                    <div className="min-w-full">
                        {/* header */}

                        <div
                            className={`grid ${gridCols} w-full justify-between gap-0 px-4 py-3 text-[12px] font-semibold
  text-[rgba(0,0,0,0.55)] bg-[rgba(0,0,0,0.02)]
  border-b border-[rgba(0,0,0,0.06)]`}
                        >

                            <div>加急</div>
                            <div>汽车状态</div>
                            <div>JOB ID</div>
                            <div>TAG</div>
                            <div>车牌号</div>
                            <div>汽车型号</div>
                            <div className="text-center">WOF</div>
                            <div className="text-center">机修</div>
                            <div className="text-center">喷漆</div>
                            <div>客户名字</div>
                            <div className="hidden lg:block">客户电话</div>
                            <div className="hidden 1440:block">创建时间</div>
                            <div className="text-right pr-1">操作</div>
                        </div>

                        {/* rows */}
                        {paginatedRows.map((r) => {
                            const isSelected = selectedIds.has(r.id);
                            return (
                                <div
                                    key={r.id}
                                // className={`border-b border-[rgba(0,0,0,0.06)] ${
                                //   isSelected ? "bg-[rgba(244,63,94,0.08)]" : "bg-white"
                                // } hover:bg-[rgba(0,0,0,0.02)]`}
                                >
                                    <div
                                        className={`grid ${gridCols} w-full justify-between gap-0 px-4 py-3 items-center border-b border-[rgba(0,0,0,0.06)] ${isSelected ? "bg-[rgba(244,63,94,0.08)]" : "bg-white"
                                            } hover:bg-[rgba(0,0,0,0.02)]`}
                                    >


                                        {/* 加载 */}
                                        <div>
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 accent-[var(--ds-primary)]"
                                                checked={isSelected}
                                                onChange={() => toggleSelect(r.id)}
                                            />
                                        </div>

                                        {/* 汽车状态 */}
                                        <div>
                                            <StatusPill status={r.vehicleStatus} />
                                        </div>

                                        {/* job id */}
                                        <div className="min-w-0">
                                            <Link to={`/jobs/${r.id}`} className="text-[rgba(37,99,235,1)] font-semibold underline">
                                                {r.id}
                                            </Link>
                                        </div>

                                        {/* tags */}
                                        <div className="min-w-0">
                                            <TagsCell selectedTags={r.selectedTags} />
                                        </div>

                                        {/* plate */}
                                        <div className="font-medium text-[rgba(0,0,0,0.70)]">{r.plate}</div>

                                        {/* vehicle model */}
                                        <div className="min-w-0 text-[rgba(0,0,0,0.60)] truncate">{r.vehicleModel}</div>

                                        {/* progress */}
                                        <div className="flex justify-center">
                                            <ProgressRing value={r.wofPct} />
                                        </div>
                                        <div className="flex justify-center">
                                            <ProgressRing value={r.mechPct} />
                                        </div>
                                        <div className="flex justify-center">
                                            <ProgressRing value={r.paintPct} />
                                        </div>

                                        {/* customer (hide on small) */}

                                        <div className="truncate">{r.customerName}</div>
                                        <div className="hidden lg:block">{r.customerPhone}</div>
                                        <div className="hidden 1440:block">{r.createdAt}</div>


                                        {/* actions */}
                                        <div className="flex justify-end gap-3 pr-1">
                                            <button className="text-[rgba(0,0,0,0.45)] hover:text-[rgba(0,0,0,0.70)]" title="Archive">
                                                <Archive size={16} />
                                            </button>
                                            <button className="text-[rgba(239,68,68,1)] hover:opacity-80" title="Delete">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* footer */}
                <div className="flex items-center justify-between px-4 py-3 text-xs text-[rgba(0,0,0,0.50)]">
                    <div>显示 {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, rows.length)} 项，共 {rows.length} 项</div>

                    <div className="flex items-center gap-2">
                        <button
                            className="h-8 px-3 rounded-[8px] border border-[rgba(0,0,0,0.10)] bg-white hover:bg-[rgba(0,0,0,0.03)] disabled:opacity-50"
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                        >
                            上一页
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                className={`h-8 w-8 rounded-[8px] ${currentPage === page
                                    ? "bg-[rgba(15,23,42,0.85)] text-white"
                                    : "border border-[rgba(0,0,0,0.10)] bg-white hover:bg-[rgba(0,0,0,0.03)]"
                                    }`}
                                onClick={() => setCurrentPage(page)}
                            >
                                {page}
                            </button>
                        ))}
                        <button
                            className="h-8 px-3 rounded-[8px] border border-[rgba(0,0,0,0.10)] bg-white hover:bg-[rgba(0,0,0,0.03)] disabled:opacity-50"
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                        >
                            下一页
                        </button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
