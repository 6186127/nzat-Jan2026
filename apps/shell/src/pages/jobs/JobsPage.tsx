import { Link, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { Card, Button } from "@/components/ui";
import { JobsFiltersCard } from "./JobsFiltersCard";
import { JobsTable } from "./JobsTable";
import { JobsPagination } from "./JobsPagination";
import { mockRows } from "../../features/jobs/mockdata";
import { useEffect, useRef } from "react";
import {
  useJobsQuery, JOBS_PAGE_SIZE, filtersToSearchParams,
  searchParamsToFilters,
  getPageFromSearchParams,
  DEFAULT_JOBS_FILTERS,
} from "@/features/jobs";





export function JobsPage() {
const [searchParams, setSearchParams] = useSearchParams();
const initialFilters = searchParamsToFilters(searchParams);
const initialPage = getPageFromSearchParams(searchParams);

const {
  filters,
  setFilters,
  resetFilters,
  paginatedRows,
  totalPages,
  totalItems,
  currentPage,
  setCurrentPage,
  pageSize,
  toggleUrgent,
} = useJobsQuery({
  initialRows: mockRows,
  pageSize: JOBS_PAGE_SIZE,
  initialFilters,
  initialPage,
});
const didSyncRef = useRef(false);
useEffect(() => {
  console.log("SYNC URL", { currentPage, filters });

  if (!didSyncRef.current) {
    didSyncRef.current = true;
    return;
  }

  const next = filtersToSearchParams(filters);
  if (currentPage > 1) next.set("page", String(currentPage));
  setSearchParams(next, { replace: true });
}, [filters, currentPage, setSearchParams]);

const onReset = () => {
  setFilters(DEFAULT_JOBS_FILTERS);
  setCurrentPage(1);
  setSearchParams(new URLSearchParams(), { replace: true });
};



  return (
    <div className="space-y-4 text-[14px]">
      <h1 className="text-2xl font-semibold text-[rgba(0,0,0,0.72)]">Jobs</h1>

      <JobsFiltersCard value={filters} onChange={setFilters} onReset={onReset} />

      <div className="flex justify-end">
        <Link to="/jobs/new">
          <Button variant="primary" leftIcon={<Plus size={16} />}>
            Add New Job
          </Button>
        </Link>
      </div>

      <Card className="overflow-hidden">
        <JobsTable rows={paginatedRows} onToggleUrgent={toggleUrgent} />

        <JobsPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
        />
      </Card>
    </div>
  );
}
