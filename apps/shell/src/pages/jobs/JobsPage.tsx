import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Card, Button } from "@/components/ui";
import { JobsFiltersCard } from "./JobsFiltersCard";
import { JobsTable } from "./JobsTable";
import { JobsPagination } from "./JobsPagination";
import { useJobsQuery } from "./useJobsQuery";
import {mockRows } from "./mockdata";


export function JobsPage() {
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
  } = useJobsQuery({ initialRows: mockRows, pageSize: 6 });

  return (
    <div className="space-y-4 text-[14px]">
      <h1 className="text-2xl font-semibold text-[rgba(0,0,0,0.72)]">Jobs</h1>

      <JobsFiltersCard value={filters} onChange={setFilters} onReset={resetFilters} />

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
