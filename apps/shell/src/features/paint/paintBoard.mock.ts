export type StageKey = "waiting" | "sheet" | "undercoat" | "painting" | "assembly" | "done";

export type PaintBoardJob = {
  id: string;
  plate: string;
  year: number;
  make: string;
  model: string;
  createdAt: string;
  daysInStage?: number;
  stage: StageKey;
};

export const PAINT_BOARD_MOCK_JOBS: PaintBoardJob[] = [
  {
    id: "job-1",
    plate: "QWE-456",
    year: 2022,
    make: "Tesla",
    model: "Model 3",
    stage: "waiting",
    createdAt: "2026-02-19",
  },
  {
    id: "job-2",
    plate: "NML-002",
    year: 2024,
    make: "BYD",
    model: "Atto 3",
    stage: "waiting",
    createdAt: "2026-02-18",
  },
  {
    id: "job-3",
    plate: "XYZ-987",
    year: 2019,
    make: "Honda",
    model: "Civic",
    daysInStage: 4,
    stage: "sheet",
    createdAt: "2026-02-16",
  },
  {
    id: "job-4",
    plate: "DDF-333",
    year: 2023,
    make: "Audi",
    model: "Q7",
    stage: "sheet",
    createdAt: "2026-02-19",
  },
  {
    id: "job-5",
    plate: "UIO-111",
    year: 2021,
    make: "Mazda",
    model: "CX-5",
    stage: "undercoat",
    createdAt: "2026-02-18",
  },
  {
    id: "job-6",
    plate: "KPL-777",
    year: 2020,
    make: "Subaru",
    model: "Forester",
    daysInStage: 4,
    stage: "undercoat",
    createdAt: "2026-02-16",
  },
  {
    id: "job-7",
    plate: "ABC-123",
    year: 2020,
    make: "Toyota",
    model: "Camry",
    stage: "painting",
    createdAt: "2026-02-17",
  },
  {
    id: "job-8",
    plate: "GGR-444",
    year: 2017,
    make: "Mercedes",
    model: "C-Class",
    daysInStage: 4,
    stage: "painting",
    createdAt: "2026-02-15",
  },
  {
    id: "job-9",
    plate: "JMX-210",
    year: 2021,
    make: "Toyota",
    model: "RAV4",
    stage: "waiting",
    createdAt: "2026-02-20",
  },
  {
    id: "job-10",
    plate: "HJK-908",
    year: 2018,
    make: "Honda",
    model: "HR-V",
    stage: "sheet",
    createdAt: "2026-02-18",
  },
  {
    id: "job-11",
    plate: "PLT-556",
    year: 2020,
    make: "Nissan",
    model: "X-Trail",
    stage: "undercoat",
    createdAt: "2026-02-19",
  },
  {
    id: "job-12",
    plate: "BNC-777",
    year: 2019,
    make: "BMW",
    model: "X3",
    stage: "painting",
    createdAt: "2026-02-17",
  },
  {
    id: "job-13",
    plate: "ZTR-321",
    year: 2016,
    make: "Volkswagen",
    model: "Golf",
    daysInStage: 4,
    stage: "assembly",
    createdAt: "2026-02-16",
  },
  {
    id: "job-14",
    plate: "MNP-234",
    year: 2022,
    make: "Kia",
    model: "Sportage",
    stage: "painting",
    createdAt: "2026-02-19",
  },
  {
    id: "job-15",
    plate: "CRL-662",
    year: 2015,
    make: "Mazda",
    model: "Axela",
    stage: "undercoat",
    createdAt: "2026-02-20",
  },
  {
    id: "job-16",
    plate: "YKD-118",
    year: 2023,
    make: "Hyundai",
    model: "Tucson",
    stage: "waiting",
    createdAt: "2026-02-21",
  },
  {
    id: "job-17",
    plate: "QAZ-909",
    year: 2018,
    make: "Subaru",
    model: "Outback",
    stage: "sheet",
    createdAt: "2026-02-17",
  },
  {
    id: "job-18",
    plate: "LKM-404",
    year: 2020,
    make: "Ford",
    model: "Ranger",
    stage: "assembly",
    createdAt: "2026-02-19",
  },
];

const normalizeDate = (value: string | Date) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const diffDays = (a: Date, b: Date) => Math.floor((a.getTime() - b.getTime()) / 86400000);

export const countPaintOverdue = (jobs: PaintBoardJob[], today = new Date()) => {
  const anchor = normalizeDate(today);
  return jobs.filter((job) => {
    if (job.stage === "done") return false;
    const created = normalizeDate(job.createdAt);
    const durationDays = diffDays(anchor, created) + 1;
    return durationDays > 3;
  }).length;
};
