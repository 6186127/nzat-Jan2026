import { useEffect, useState, useRef } from "react";
import type { JobRow, JobsFilters } from "@/types/JobType";
import { DEFAULT_JOBS_FILTERS } from "./jobs.defaults";


type Options = {
  initialRows: JobRow[];
  pageSize?: number;
  initialFilters?: JobsFilters;
  initialPage?: number;
};


export function useJobsQuery(options: Options) {
  const pageSize = options.pageSize ?? 6;

 
  const [allRows, setAllRows] = useState<JobRow[]>(options.initialRows);


  const [filters, setFilters] = useState<JobsFilters>(
    options.initialFilters ?? DEFAULT_JOBS_FILTERS
  );


 const [currentPage, setCurrentPage] = useState<number>(
  options.initialPage ?? 1
);

const didMountRef = useRef(false);

  useEffect(() => {
     if (!didMountRef.current) {
    didMountRef.current = true;
    return;
  }
    setCurrentPage(1);
  }, [filters]);


  const toggleUrgent = (id: string) => {
    setAllRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, urgent: !r.urgent } : r))
    );
  };


  const resetFilters = () => setFilters(DEFAULT_JOBS_FILTERS);

  return {
    // source data (MVP)
    allRows,
    setAllRows,

    // filters
    filters,
    setFilters,
    resetFilters,

    // urgent action
    toggleUrgent,

    // paging
    currentPage,
    setCurrentPage,
    pageSize,

    // results
    visibleRows: allRows,
  };
}
