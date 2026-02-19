import { Filter, Download, Plus, AlertCircle } from "lucide-react";
import {
  PAINT_BOARD_MOCK_JOBS,
  countPaintOverdue,
  type PaintBoardJob,
  type StageKey,
} from "@/features/paint/paintBoard.mock";

const STAGES: Record<
  StageKey,
  {
    label: string;
    dot: string;
    pill: string;
    bar: string;
    barSoft: string;
    text: string;
  }
> = {
  waiting: {
    label: "等待处理",
    dot: "bg-slate-400",
    pill: "bg-slate-100 text-slate-700",
    bar: "bg-slate-300",
    barSoft: "bg-slate-100",
    text: "text-slate-700",
  },
  sheet: {
    label: "钣金/底漆",
    dot: "bg-sky-500",
    pill: "bg-sky-100 text-sky-700",
    bar: "bg-sky-500",
    barSoft: "bg-sky-100",
    text: "text-sky-700",
  },
  undercoat: {
    label: "打底漆",
    dot: "bg-indigo-500",
    pill: "bg-indigo-100 text-indigo-700",
    bar: "bg-indigo-500",
    barSoft: "bg-indigo-100",
    text: "text-indigo-700",
  },
  painting: {
    label: "喷漆",
    dot: "bg-fuchsia-500",
    pill: "bg-fuchsia-100 text-fuchsia-700",
    bar: "bg-fuchsia-500",
    barSoft: "bg-fuchsia-100",
    text: "text-fuchsia-700",
  },
  assembly: {
    label: "配件组装",
    dot: "bg-orange-500",
    pill: "bg-orange-100 text-orange-700",
    bar: "bg-orange-500",
    barSoft: "bg-orange-100",
    text: "text-orange-700",
  },
  done: {
    label: "完成",
    dot: "bg-emerald-500",
    pill: "bg-emerald-100 text-emerald-700",
    bar: "bg-emerald-500",
    barSoft: "bg-emerald-100",
    text: "text-emerald-700",
  },
};

const DAY_WIDTH = 96;
const FUTURE_BUFFER_DAYS = 3;
const MIN_TIMELINE_DAYS = 7;

const normalizeDate = (value: string | Date) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const diffDays = (a: Date, b: Date) => Math.floor((a.getTime() - b.getTime()) / 86400000);

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const buildDays = (start: Date, count: number) => {
  return Array.from({ length: count }, (_, index) => {
    const current = addDays(start, index);
    const label = current.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    return { label, day: current.getDate(), date: current };
  });
};

export function PaintBoardPage() {
  const today = normalizeDate(new Date());
  const activeJobs = PAINT_BOARD_MOCK_JOBS.filter((job) => job.stage !== "done");
  const baseJobs = activeJobs.length > 0 ? activeJobs : PAINT_BOARD_MOCK_JOBS;
  const timelineStart = baseJobs
    .map((job) => normalizeDate(job.createdAt))
    .reduce((min, current) => (current < min ? current : min), today);
  const timelineEnd = addDays(today, FUTURE_BUFFER_DAYS);
  const totalDays = Math.max(MIN_TIMELINE_DAYS, diffDays(timelineEnd, timelineStart) + 1);
  const days = buildDays(timelineStart, totalDays);
  const todayIndex = Math.max(0, Math.min(totalDays - 1, diffDays(today, timelineStart)));

  const timelineWidth = days.length * DAY_WIDTH;
  const todayLeft = todayIndex * DAY_WIDTH;
  const overdueCount = countPaintOverdue(PAINT_BOARD_MOCK_JOBS, today);
  const stageOrder: Record<StageKey, number> = {
    waiting: 0,
    sheet: 1,
    undercoat: 2,
    painting: 3,
    assembly: 4,
    done: 5,
  };
  const sortedJobs = [...PAINT_BOARD_MOCK_JOBS].sort((a, b) => {
    const stageDiff = stageOrder[a.stage] - stageOrder[b.stage];
    if (stageDiff !== 0) return stageDiff;
    const startDiff = normalizeDate(a.createdAt).getTime() - normalizeDate(b.createdAt).getTime();
    if (startDiff !== 0) return startDiff;
    return a.plate.localeCompare(b.plate);
  });

  return (
    <div
      className="flex h-full max-h-full flex-col gap-5"
      style={{
        fontFamily: '"Manrope","Plus Jakarta Sans","Space Grotesk","Segoe UI",sans-serif',
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* <button className="flex items-center gap-2 rounded-xl border border-[rgba(15,23,42,0.08)] bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
            <Filter className="h-4 w-4" />
            Filter
          </button> */}
         
        </div>
      
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-[rgba(15,23,42,0.08)] bg-white/90 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(15,23,42,0.06)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="text-xl font-semibold text-slate-800">Paint Status Timeline</div>
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
              {overdueCount} overdue
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
            {Object.values(STAGES).map((stage) => (
              <span key={stage.label} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${stage.dot}`} />
                {stage.label}
              </span>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <div
            className="grid"
            style={{ gridTemplateColumns: "320px minmax(600px,1fr)" }}
          >
            <div className="border-b border-[rgba(15,23,42,0.06)] bg-slate-50 px-6 py-4 text-xs font-semibold tracking-[0.12em] text-slate-400">
              VEHICLE DETAILS
            </div>
            <div className="relative border-b border-[rgba(15,23,42,0.06)]">
              <div className="flex items-center" style={{ minWidth: timelineWidth }}>
                {days.map((item, index) => {
                  const isToday = index === todayIndex;
                  return (
                    <div
                      key={`${item.label}-${item.day}`}
                      className="flex h-16 flex-col items-center justify-center border-l border-[rgba(15,23,42,0.06)] text-xs font-semibold text-slate-500"
                      style={{ width: DAY_WIDTH }}
                    >
                      <span className="uppercase">{item.label}</span>
                      <span
                        className={[
                          "mt-1 flex h-7 w-7 items-center justify-center rounded-full text-sm",
                          isToday ? "bg-blue-600 text-white shadow-md" : "text-slate-800",
                        ].join(" ")}
                      >
                          {item.day}
                        </span>
                      </div>
                    );
                  })}
              </div>
              <div
                className="absolute inset-y-0 w-px bg-blue-400/70"
                style={{ left: todayLeft }}
              />
            </div>

            {sortedJobs.map((job, index) => {
              const stage = STAGES[job.stage];
              const createdAt = normalizeDate(job.createdAt);
              const rawStartIndex = diffDays(createdAt, timelineStart);
              const startIndex = Math.max(0, Math.min(days.length - 1, rawStartIndex));
              const durationDays = Math.max(1, diffDays(today, createdAt) + 1);
              const maxDuration = Math.max(1, days.length - startIndex);
              const clampedDuration = Math.min(durationDays, maxDuration);
              const left = startIndex * DAY_WIDTH;
              const width = clampedDuration * DAY_WIDTH;
              const overdue = durationDays > 3;
              const rowBg = index % 2 === 0 ? "bg-white" : "bg-slate-50/60";
              return (
                <>
                  <div
                    key={`${job.id}-info`}
                    className={`border-b border-[rgba(15,23,42,0.06)] px-6 py-4 ${rowBg}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {overdue ? (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          ) : null}
                          <div className="text-base font-semibold text-slate-800">{job.plate}</div>
                        </div>
                        <div className="text-xs text-slate-500">
                          {job.year} · {job.make} {job.model}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          {durationDays}d in shop
                          {job.daysInStage ? (
                            <span className="ml-2 text-red-500">{job.daysInStage}d in stage</span>
                          ) : null}
                        </div>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${stage.pill}`}>
                        {stage.label}
                      </span>
                    </div>
                  </div>

                  <div
                    key={`${job.id}-timeline`}
                    className={`relative border-b border-[rgba(15,23,42,0.06)] ${rowBg}`}
                  >
                    <div
                      className="relative h-16"
                      style={{
                        minWidth: timelineWidth,
                        backgroundImage: `repeating-linear-gradient(to right, rgba(15,23,42,0.05) 0, rgba(15,23,42,0.05) 1px, transparent 1px, transparent ${DAY_WIDTH}px)`,
                      }}
                    >
                      <div
                        className="absolute inset-y-0 w-px bg-blue-400/70"
                        style={{ left: todayLeft }}
                      />
                      <div
                        className={`absolute top-3 flex h-10 items-center justify-center rounded-full px-3 text-xs font-semibold ${stage.text} ${stage.barSoft}`}
                        style={{
                          left,
                          width,
                          border: overdue ? "2px solid #ef4444" : "1px solid rgba(15,23,42,0.08)",
                        }}
                      >
                        <div
                          className={`absolute left-0 top-0 h-full rounded-full ${stage.bar}`}
                          style={{ width: "42%" }}
                        />
                        <span className="relative z-10">{durationDays}天</span>
                        {overdue ? (
                          <span className="relative z-10 ml-2 rounded-full bg-red-500 px-1 text-[10px] text-white">
                            !
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
