import type { JobDetailTabKey } from "@/types";

export const jobDetailTabs: { key: JobDetailTabKey; label: string }[] = [
  { key: "WOF", label: "WOF" },
  { key: "Mechanical", label: "机修" },
  { key: "Paint", label: "喷漆" },
  { key: "Log", label: "Log" },
  { key: "Invoice", label: "Invoice" },
];
