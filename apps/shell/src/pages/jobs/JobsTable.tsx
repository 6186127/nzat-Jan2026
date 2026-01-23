import { Link } from "react-router-dom";
import { Archive, Trash2 } from "lucide-react";
import { StatusPill, ProgressRing, TagsCell } from "@/components/jobs";
import type { JobRow } from "@/types/JobType";
// import { gridCols } from "./jobs.constants"; // 或者放 constants

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

type Props = {
  rows: JobRow[];
  onToggleUrgent: (id: string) => void;
};

export function JobsTable({ rows, onToggleUrgent}: Props) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-full">
        {/* header */}
        <div
          className={`grid ${gridCols} gap-0 justify-evenly px-4 py-3 text-[12px] font-semibold
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
        {rows.map((r) => {
        //   const isSelected = selectedIds.has(r.id);
          return (
            <div key={r.id}>
              <div
                className={`grid ${gridCols} gap-0 justify-evenly px-4 py-3 items-center border-b border-[rgba(0,0,0,0.06)]
                ${r.urgent ? "bg-[rgba(244,63,94,0.08)]" : "bg-white"}
                hover:bg-[rgba(0,0,0,0.02)]`}
              >
                <div>
                 <input
  type="checkbox"
  className="h-4 w-4 accent-[var(--ds-primary)]"
  checked={r.urgent}
  onChange={() => onToggleUrgent(r.id)}
/>

                </div>

                <div><StatusPill status={r.vehicleStatus} /></div>

                <div className="min-w-0">
                  <Link to={`/jobs/${r.id}`} className="text-[rgba(37,99,235,1)] font-semibold underline">
                    {r.id}
                  </Link>
                </div>

                <div className="min-w-0"><TagsCell selectedTags={r.selectedTags} /></div>
                <div className="font-medium text-[rgba(0,0,0,0.70)]">{r.plate}</div>
                <div className="min-w-0 text-[rgba(0,0,0,0.60)] truncate">{r.vehicleModel}</div>

                <div className="flex justify-center"><ProgressRing value={r.wofPct} /></div>
                <div className="flex justify-center"><ProgressRing value={r.mechPct} /></div>
                <div className="flex justify-center"><ProgressRing value={r.paintPct} /></div>

                <div className="truncate">{r.customerName}</div>
                <div className="hidden lg:block">{r.customerPhone}</div>
                <div className="hidden 1440:block">{r.createdAt}</div>

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
  );
}
