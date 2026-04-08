import type { JobsFilters } from "@/types/JobType";

export const DEFAULT_JOBS_FILTERS: JobsFilters = {
  search: "",
  jobType: "",
  wofStatus: "",
  paintStatus: "",
  timeRange: "",
  startDate: "",
  endDate: "",
  customer: "",
  selectedTags: [],
};
