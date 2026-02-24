import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Input, Select } from "@/components/ui";
import { fetchPaintBoard, updatePaintStage } from "@/features/paint/api/paintApi";
import {
  addDays,
  buildDays,
  countOverdue,
  diffDays,
  getDurationDays,
  mapStageKey,
  normalizeDate,
  type PaintBoardJob,
  type StageKey,
} from "@/features/paint/paintBoard.utils";

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

const STAGE_PROGRESS: Record<StageKey, number> = {
  waiting: 0.12,
  sheet: 0.28,
  undercoat: 0.46,
  painting: 0.68,
  assembly: 0.84,
  done: 1,
};

const DAY_WIDTH = 96;
const FUTURE_BUFFER_DAYS = 3;
const MIN_TIMELINE_DAYS = 7;

export function PaintBoardPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<PaintBoardJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<"all" | StageKey>("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      const res = await fetchPaintBoard();
      if (!res.ok) {
        if (!cancelled) setLoadError(res.error || "加载失败");
        setLoading(false);
        return;
      }
      const list = Array.isArray(res.data?.jobs) ? res.data.jobs : [];
      if (!cancelled) setJobs(list);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const today = normalizeDate(new Date());
  const filteredJobs = useMemo(() => {
    const fromDate = createdFrom ? normalizeDate(createdFrom) : null;
    const toDate = createdTo ? normalizeDate(createdTo) : null;
    return jobs.filter((job) => {
      const stageKey = mapStageKey(job.status, job.currentStage);
      if (selectedStage !== "all" && stageKey !== selectedStage) return false;
      if (overdueOnly && getDurationDays(job.createdAt, today) <= 3) return false;
      const createdAt = normalizeDate(job.createdAt);
      if (fromDate && createdAt < fromDate) return false;
      if (toDate && createdAt > toDate) return false;
      return true;
    });
  }, [jobs, selectedStage, overdueOnly, createdFrom, createdTo, today]);

  const activeJobs = filteredJobs.filter((job) => mapStageKey(job.status, job.currentStage) !== "done");
  const baseJobs = activeJobs.length > 0 ? activeJobs : filteredJobs;
  const timelineStart =
    baseJobs.length > 0
      ? baseJobs
          .map((job) => normalizeDate(job.createdAt))
          .reduce((min, current) => (current < min ? current : min), today)
      : today;
  const timelineEnd = addDays(today, FUTURE_BUFFER_DAYS);
  const totalDays = Math.max(MIN_TIMELINE_DAYS, diffDays(timelineEnd, timelineStart) + 1);
  const days = buildDays(timelineStart, totalDays);
  const todayIndex = Math.max(0, Math.min(totalDays - 1, diffDays(today, timelineStart)));

  const timelineWidth = days.length * DAY_WIDTH;
  const todayLeft = todayIndex * DAY_WIDTH;
  const overdueCount = countOverdue(filteredJobs, today);
  const stageOrder: Record<StageKey, number> = {
    waiting: 0,
    sheet: 1,
    undercoat: 2,
    painting: 3,
    assembly: 4,
    done: 5,
  };
  const sortedJobs = useMemo(() => {
    const copy = [...filteredJobs];
    return copy.sort((a, b) => {
      const stageA = mapStageKey(a.status, a.currentStage);
      const stageB = mapStageKey(b.status, b.currentStage);
      const stageDiff = stageOrder[stageA] - stageOrder[stageB];
      if (stageDiff !== 0) return stageDiff;
      const startDiff = normalizeDate(a.createdAt).getTime() - normalizeDate(b.createdAt).getTime();
      if (startDiff !== 0) return startDiff;
      return a.plate.localeCompare(b.plate);
    });
  }, [filteredJobs]);

  const handleRowClick = (id: string) => {
    navigate(`/jobs/${id}`);
  };

  const handleStageChange = async (jobId: string, nextStage: StageKey) => {
    const stageIndexMap: Record<StageKey, number> = {
      waiting: -1,
      sheet: 0,
      undercoat: 1,
      painting: 2,
      assembly: 3,
      done: 4,
    };
    const stageIndex = stageIndexMap[nextStage];
    await updatePaintStage(jobId, stageIndex);
    const res = await fetchPaintBoard();
    if (res.ok) {
      const list = Array.isArray(res.data?.jobs) ? res.data.jobs : [];
      setJobs(list);
    }
  };

  const handleResetFilters = () => {
    setSelectedStage("all");
    setOverdueOnly(false);
    setCreatedFrom("");
    setCreatedTo("");
  };

  return (
    <div
      className="flex h-full max-h-full flex-col gap-5"
      style={{
        fontFamily: '"Manrope","Plus Jakarta Sans","Space Grotesk","Segoe UI",sans-serif',
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 ">
          {/* <div className="text-xl font-semibold text-slate-800 ml-2 mr-4">筛选</div> */}
         <div><Select
            value={selectedStage}
            onChange={(event) => setSelectedStage(event.target.value as "all" | StageKey)}
            className="h-9 w-[140px]"
          >
            <option value="all">全部阶段</option>
            {Object.entries(STAGES).map(([key, stage]) => (
              <option key={key} value={key}>
                {stage.label}
              </option>
            ))}
          </Select></div> 
          
          <label className="flex items-center gap-2 rounded-xl border border-[rgba(15,23,42,0.08)] bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(event) => setOverdueOnly(event.target.checked)}
              className="h-4 w-4 accent-blue-600"
            />
            仅逾期
          </label>
          <div>

        
          <Input
            type="date"
            value={createdFrom}
            onChange={(event) => setCreatedFrom(event.target.value)}
            className="h-9 w-[150px]"
          />
            </div>
          <span className="text-xs text-slate-400">到</span>
          <div>
          <Input
            type="date"
            value={createdTo}
            onChange={(event) => setCreatedTo(event.target.value)}
            className="h-9 w-[150px]"
          />
            </div>
          <button
            type="button"
            className="rounded-xl border border-[rgba(15,23,42,0.08)] bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:text-slate-800"
            onClick={handleResetFilters}
          >
            重置
          </button>
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
          {loading ? (
            <div className="p-6 text-sm text-[var(--ds-muted)]">加载中...</div>
          ) : loadError ? (
            <div className="p-6 text-sm text-red-600">{loadError}</div>
          ) : sortedJobs.length === 0 ? (
            <div className="p-6 text-sm text-[var(--ds-muted)]">暂无喷漆数据</div>
          ) : null}
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
              const stageKey = mapStageKey(job.status, job.currentStage);
              const stage = STAGES[stageKey];
              const progressPct = Math.min(1, Math.max(0, STAGE_PROGRESS[stageKey] ?? 0.2));
              const createdAt = normalizeDate(job.createdAt);
              const rawStartIndex = diffDays(createdAt, timelineStart);
              const startIndex = Math.max(0, Math.min(days.length - 1, rawStartIndex));
              const durationDays = getDurationDays(job.createdAt, today);
              const maxDuration = Math.max(1, days.length - startIndex);
              const clampedDuration = Math.min(durationDays, maxDuration);
              const left = startIndex * DAY_WIDTH;
              const width = clampedDuration * DAY_WIDTH;
              const overdue = durationDays >= 3;
              const rowBg = index % 2 === 0 ? "bg-white" : "bg-slate-50/60";
              return (
                <>
                  <div
                    key={`${job.id}-info`}
                    className={`border-b border-[rgba(15,23,42,0.06)] px-6 py-4 ${rowBg} cursor-pointer hover:bg-slate-200/80`}
                    onClick={() => handleRowClick(job.id)}
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
                          <span
                            className={[
                              "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                              overdue
                                ? "border-2 border-red-400 bg-red-50 text-red-700 shadow-[0_0_0_2px_rgba(239,68,68,0.08)]"
                                : "border-slate-200 bg-slate-50 text-slate-600",
                            ].join(" ")}
                          >
                            {durationDays}天在店{overdue ? " !" : ""}
                          </span>
                          {job.daysInStage ? (
                            <span className="ml-2 text-red-500">{job.daysInStage}d in stage</span>
                          ) : null}
                        </div>
                      </div>
                      <select
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${stage.pill} bg-transparent`}
                        value={stageKey}
                        onChange={(event) => {
                          event.stopPropagation();
                          handleStageChange(job.id, event.target.value as StageKey);
                        }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {Object.entries(STAGES).map(([key, option]) => (
                          <option key={key} value={key}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div
                    key={`${job.id}-timeline`}
                    className={`relative border-b border-[rgba(15,23,42,0.06)] ${rowBg} cursor-pointer hover:bg-slate-200/80`}
                    onClick={() => handleRowClick(job.id)}
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
                          style={{ width: `${Math.max(12, Math.round(progressPct * 100))}%` }}
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
