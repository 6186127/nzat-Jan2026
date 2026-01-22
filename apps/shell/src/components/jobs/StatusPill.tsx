import type { JobStatus } from "@/types/JobType";

export function StatusPill({ status }: { status: JobStatus }) {
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
