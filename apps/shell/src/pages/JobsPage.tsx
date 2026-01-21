import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Archive, Trash2, RotateCcw } from "lucide-react";

type JobStatus = "In Progress" | "Completed" | "Pending" | "Ready" | "Archived" | "Cancelled";

type JobRow = {
  id: string;
  vehicleStatus: JobStatus;
  tags: string[];
  plate: string;
  vehicleModel: string;
  wofPct: number | null;
  mechPct: number | null;
  paintPct: number | null;
  customerName: string;
  customerPhone: string;
  createdAt: string;
};


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


const mockRows: JobRow[] = [
  {
    id: "J-20251206",
    vehicleStatus: "In Progress",
    tags: ["Badge", "VIP", "Urgent", "Parts"],
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
    tags: ["Repeat"],
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
    tags: [],
    plate: "CCTV001",
    vehicleModel: "Toyota Corolla 2018",
    wofPct: 0,
    mechPct: null,
    paintPct: null,
    customerName: "王伟",
    customerPhone: "0218796689",
    createdAt: "2026/01/06",
  },
];

function Card(props: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={[
        "rounded-[12px] border border-[var(--ds-border)] bg-white shadow-sm",
        props.className || "",
      ].join(" ")}
    >
      {props.children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "h-9 w-full rounded-[8px] border border-[rgba(0,0,0,0.10)] bg-white px-3 text-sm",
        "outline-none focus:border-[rgba(37,99,235,0.45)] focus:ring-2 focus:ring-[rgba(37,99,235,0.12)]",
        props.className || "",
      ].join(" ")}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={[
        "h-9 w-full rounded-[8px] border border-[rgba(0,0,0,0.10)] bg-white px-3 text-sm",
        "outline-none focus:border-[rgba(37,99,235,0.45)] focus:ring-2 focus:ring-[rgba(37,99,235,0.12)]",
        props.className || "",
      ].join(" ")}
    />
  );
}

function Button(props: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost";
  leftIcon?: React.ReactNode;
}) {
  const v = props.variant ?? "ghost";
  const cls =
    v === "primary"
      ? "bg-[var(--ds-primary)] text-white hover:opacity-95"
      : "bg-white text-[rgba(0,0,0,0.72)] border border-[rgba(0,0,0,0.10)] hover:bg-[rgba(0,0,0,0.03)]";

  return (
    <button
      onClick={props.onClick}
      className={[
        "h-9 inline-flex items-center gap-2 rounded-[8px] px-3 text-sm font-medium transition",
        cls,
      ].join(" ")}
      type="button"
    >
      {props.leftIcon}
      {props.children}
    </button>
  );
}

function StatusPill({ status }: { status: JobStatus }) {
  const cfg =
    status === "Completed"
      ? {
          bg: "bg-green-100",
          bd: "border-green-300",
          tx: "text-green-700",
          dot: "bg-green-600",
          label: "维修完成",
        }
      : status === "In Progress"
      ? {
          bg: "bg-amber-100",
          bd: "border-amber-300",
          tx: "text-amber-700",
          dot: "bg-amber-600",
          label: "进行中",
        }
      : status === "Ready"
      ? {
          bg: "bg-blue-100",
          bd: "border-blue-300",
          tx: "text-blue-700",
          dot: "bg-blue-600",
          label: "可交车",
        }
      : status === "Archived"
      ? {
          bg: "bg-slate-100",
          bd: "border-slate-300",
          tx: "text-slate-700",
          dot: "bg-slate-600",
          label: "归档",
        }
      : status === "Cancelled"
      ? {
          bg: "bg-red-100",
          bd: "border-red-300",
          tx: "text-red-700",
          dot: "bg-red-600",
          label: "取消",
        }
      : {
          bg: "bg-slate-100",
          bd: "border-slate-300",
          tx: "text-slate-700",
          dot: "bg-slate-600",
          label: "Pending",
        };

  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-[8px] border px-2 py-1 text-[11px] font-medium",
        cfg.bg,
        cfg.bd,
        cfg.tx,
      ].join(" ")}
    >
      <span className={["h-1.5 w-1.5 rounded-full", cfg.dot].join(" ")} />
      {cfg.label}
    </span>
  );
}

function ProgressRing({ value, size = 34 }: { value: number | null; size?: number }) {
  if (value === null) {
    return <div className="h-2 w-8 rounded-full bg-[rgba(0,0,0,0.12)]" />;
  }
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * c;

  const color =
    pct >= 80
      ? "stroke-[rgba(34,197,94,1)]"
      : pct >= 40
      ? "stroke-[rgba(245,158,11,1)]"
      : "stroke-[rgba(239,68,68,1)]";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="transparent"
          className="stroke-[rgba(0,0,0,0.10)]"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="transparent"
          className={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
        />
      </svg>
      <span className="absolute text-[10px] font-semibold text-[rgba(0,0,0,0.60)]">{pct}%</span>
    </div>
  );
}

function TagChip({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[rgba(37,99,235,0.25)] bg-[rgba(37,99,235,0.08)] px-2 py-0.5 text-[11px] text-[rgba(37,99,235,0.95)]">
      {text}
    </span>
  );
}

function TagsCell({ tags }: { tags: string[] }) {
  const maxShow = 2;
  const shown = tags.slice(0, maxShow);
  const rest = tags.length - shown.length;

  return (
    <div className="relative group flex items-center gap-2 min-w-0">
      <div className="flex items-center gap-1 min-w-0 overflow-hidden">
        {shown.map((t, i) => (
          <TagChip key={`${t}-${i}`} text={t} />
        ))}
        {rest > 0 && (
          <span className="inline-flex items-center rounded-full border border-[rgba(0,0,0,0.10)] bg-[rgba(0,0,0,0.02)] px-2 py-0.5 text-[11px] text-[rgba(0,0,0,0.55)]">
            +{rest}
          </span>
        )}
      </div>

      {/* hover 展示完整 tags */}
      {tags.length > 2 && (
        <div className="pointer-events-none absolute left-0 top-8 z-10 hidden w-[260px] rounded-[10px] border border-[rgba(0,0,0,0.10)] bg-white p-2 text-xs text-[rgba(0,0,0,0.72)] shadow-lg group-hover:block">
          <div className="flex flex-wrap gap-2">
            {tags.map((t, i) => (
              <TagChip key={`${t}-full-${i}`} text={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function JobsPage() {
  const [jobType, setJobType] = useState("");
  const [timeRange, setTimeRange] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [customer, setCustomer] = useState("");
  const [tag, setTag] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 计算日期范围
  const getDateRange = () => {
    const today = new Date();
    const start = new Date();
    const end = new Date();

    switch (timeRange) {
      case "week":
        const day = today.getDay() || 7;
        start.setDate(today.getDate() - day + 1);
        end.setDate(today.getDate() + (7 - day));
        break;
      case "lastWeek":
        // 上周
        const lastDay = new Date(today);
        lastDay.setDate(today.getDate() - today.getDay());
        start.setDate(lastDay.getDate() - 7);
        end.setDate(lastDay.getDate() - 1);
        break;
      case "month":
        // 本月
        start.setDate(1);
        end.setDate(31);
        break;
      case "custom":
        // 自定义
        if (startDate) start.setTime(new Date(startDate).getTime());
        if (endDate) end.setTime(new Date(endDate).getTime());
        break;
      default:
        return null;
    }

    return { start, end };
  };

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    let filtered = mockRows.filter((r) => {
      // 搜索过滤
      if (s) {
        const matchesSearch =
          r.id.toLowerCase().includes(s) ||
          r.plate.toLowerCase().includes(s) ||
          r.vehicleModel.toLowerCase().includes(s) ||
          r.customerName.toLowerCase().includes(s);
        if (!matchesSearch) return false;
      }

      // Job Type 过滤
      if (jobType && r.vehicleStatus !== jobType) {
        return false;
      }

      // 日期范围过滤
      if (timeRange) {
        const dateRange = getDateRange();
        if (dateRange) {
          const rowDate = new Date(r.createdAt.split(" ")[0].replace(/\//g, "-"));
          if (rowDate < dateRange.start || rowDate > dateRange.end) {
            return false;
          }
        }
      }

      // 客户过滤
      if (customer && !r.customerName.toLowerCase().includes(customer.toLowerCase())) {
        return false;
      }

      return true;
    });

    // 将选中的行排到最前面
    return filtered.sort((a, b) => {
      const aSelected = selectedIds.has(a.id);
      const bSelected = selectedIds.has(b.id);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });
  }, [search, jobType, timeRange, customer, startDate, endDate, selectedIds]);

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
    // <div className="space-y-4">
    <div className="space-y-4 text-[14px]">

      <h1 className="text-2xl font-semibold text-[rgba(0,0,0,0.72)]">Jobs</h1>

      {/* Filters section */}
     {/* todo:hidden when at phone screen */}

      <Card className="p-4">
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
         {/* todo: edit to MULTI-select tags */}
          <div className="col-span-12 md:col-span-3 lg:col-span-3">
            <div className="text-xs text-[rgba(0,0,0,0.55)] mb-1">Tag</div>
            <Select value={tag} onChange={(e) => setTag(e.target.value)}>
              <option value="">Select tags</option>
              <option value="badge">Badge</option>
              <option value="vip">VIP</option>
              <option value="urgent">Urgent</option>
            </Select>
          </div>
 
          <div className="col-span-12 md:col-span-6 lg:col-span-3">
            <div className="text-xs text-[rgba(0,0,0,0.55)] mb-1">搜索</div>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(0,0,0,0.40)]" />
              <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="
    col-span-12
    lg:col-start-10 lg:col-end-13
    flex justify-end gap-3
  ">
            <Button
              onClick={() => {
                setJobType("");
                setTimeRange("");
                setCustomer("");
                setTag("");
                setSearch("");
              }}
              leftIcon={<RotateCcw size={16} />}
            >
              Reset
            </Button>
            <Button variant="primary">Apply</Button>
          </div>
        </div>
      </Card>

{/* todo: add new job button at top of table and redirect to jobsnew page */}
      {/* Table wrapper: enable horizontal scroll */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {/* min width makes horizontal scroll kick in instead of squishing */}
          <div className="min-w-full">
            {/* header */}
       
            <div
  className={`grid ${gridCols} gap-2 px-4 py-3 text-[12px] font-semibold
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
            {rows.map((r, idx) => {
              const isSelected = selectedIds.has(r.id);
              return (
              <div
                key={r.id}
                className={`border-b border-[rgba(0,0,0,0.06)] ${
                  isSelected ? "bg-[rgba(244,63,94,0.08)]" : "bg-white"
                } hover:bg-[rgba(0,0,0,0.02)]`}
              >
                <div
  className={`grid ${gridCols} gap-2 px-4 py-3 items-center`}
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
                  <TagsCell tags={r.tags} />
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
          <div>显示 1-15 项，共 50 项</div>

          <div className="flex items-center gap-2">
            <button className="h-8 px-3 rounded-[8px] border border-[rgba(0,0,0,0.10)] bg-white hover:bg-[rgba(0,0,0,0.03)]">
              上一页
            </button>
            <button className="h-8 w-8 rounded-[8px] bg-[rgba(15,23,42,0.85)] text-white">1</button>
            <button className="h-8 w-8 rounded-[8px] border border-[rgba(0,0,0,0.10)] bg-white hover:bg-[rgba(0,0,0,0.03)]">
              2
            </button>
            <span className="px-1">…</span>
            <button className="h-8 w-8 rounded-[8px] border border-[rgba(0,0,0,0.10)] bg-white hover:bg-[rgba(0,0,0,0.03)]">
              4
            </button>
            <button className="h-8 px-3 rounded-[8px] border border-[rgba(0,0,0,0.10)] bg-white hover:bg-[rgba(0,0,0,0.03)]">
              下一页
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
