export type StageKey = "waiting" | "sheet" | "undercoat" | "painting" | "assembly" | "done";

export type PaintBoardJob = {
  id: string;
  createdAt: string;
  plate: string;
  year?: number;
  make?: string;
  model?: string;
  status?: string | null;
  currentStage?: number | null;
  daysInStage?: number;
  panels?: number | null;
  notes?: string | null;
};

export const normalizeDate = (value: string | Date) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const diffDays = (a: Date, b: Date) => Math.floor((a.getTime() - b.getTime()) / 86400000);

export const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const buildDays = (start: Date, count: number) => {
  return Array.from({ length: count }, (_, index) => {
    const current = addDays(start, index);
    const label = current.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    return { label, day: current.getDate(), date: current };
  });
};

export const mapStageKey = (status?: string | null, currentStage?: number | null): StageKey => {
  if (status === "done") return "done";
  if (typeof currentStage !== "number" || currentStage < 0) return "waiting";
  if (currentStage <= 0) return "sheet";
  if (currentStage === 1) return "undercoat";
  if (currentStage === 2) return "painting";
  if (currentStage >= 3) return "assembly";
  return "waiting";
};

export const getDurationDays = (createdAt: string, today = new Date()) => {
  const anchor = normalizeDate(today);
  const created = normalizeDate(createdAt);
  return Math.max(1, diffDays(anchor, created) + 1);
};

export const countOverdue = (jobs: PaintBoardJob[], today = new Date()) => {
  return jobs.filter((job) => {
    const stage = mapStageKey(job.status ?? undefined, job.currentStage ?? undefined);
    if (stage === "done") return false;
    return getDurationDays(job.createdAt, today) >= 3;
  }).length;
};
