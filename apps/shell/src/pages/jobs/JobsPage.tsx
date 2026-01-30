import { Link, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { Card, Button, EmptyState, Alert } from "@/components/ui";
import { JobsFiltersCard } from "./JobsFiltersCard";
import { JobsTable } from "./JobsTable";
import { JobsPagination } from "./JobsPagination";
import { useEffect, useRef, useState } from "react";
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
const [loading, setLoading] = useState(true);
const [loadError, setLoadError] = useState<string | null>(null);

const {
  filters,
  setFilters,
  paginatedRows,
  totalPages,
  totalItems,
  currentPage,
  setCurrentPage,
  pageSize,
  toggleUrgent,
  setAllRows,
} = useJobsQuery({
  initialRows: [],
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

useEffect(() => {
  let cancelled = false;

  const loadJobs = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "加载工单失败");
      }
      const rows = Array.isArray(data) ? data : data?.items ?? [];
      if (!cancelled) {
        if (rows.length === 0) {
          setAllRows(rows);
          return;
        }

        const ids = rows.map((row: { id?: string }) => row.id).filter(Boolean).join(",");
        if (!ids) {
          setAllRows(rows);
          return;
        }

        const tagsRes = await fetch(`/api/jobs/tags?ids=${encodeURIComponent(ids)}`);
        const tagsData = await tagsRes.json().catch(() => null);
        if (!tagsRes.ok) {
          throw new Error(tagsData?.error || "加载标签失败");
        }

        const tagMap = new Map<string, string[]>();
        if (Array.isArray(tagsData)) {
          tagsData.forEach((entry) => {
            if (entry?.jobId) {
              tagMap.set(String(entry.jobId), Array.isArray(entry.tags) ? entry.tags : []);
            }
          });
        }

        const rowsWithTags = rows.map((row: any) => {
          const tags = tagMap.get(String(row.id)) ?? [];
          const mergedTags = row.urgent ? Array.from(new Set(["Urgent", ...tags])) : tags;
          return { ...row, selectedTags: mergedTags };
        });

        setAllRows(rowsWithTags);
      }
    } catch (err) {
      if (!cancelled) {
        setAllRows([]);
        setLoadError(err instanceof Error ? err.message : "加载工单失败");
      }
    } finally {
      if (!cancelled) setLoading(false);
    }
  };

  loadJobs();

  return () => {
    cancelled = true;
  };
}, [setAllRows]);



  return (
    <div className="space-y-4 text-[14px]">
      <h1 className="text-2xl font-semibold text-[rgba(0,0,0,0.72)]">Jobs</h1>

      {loadError ? (
        <Alert variant="error" description={loadError} onClose={() => setLoadError(null)} />
      ) : null}

      <JobsFiltersCard value={filters} onChange={setFilters} onReset={onReset} />

      <div className="flex justify-end">
        <Link to="/jobs/new">
          <Button variant="primary" leftIcon={<Plus size={16} />}>
            Add New Job
          </Button>
        </Link>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="py-10 text-center text-sm text-[var(--ds-muted)]">加载中...</div>
        ) : totalItems === 0 ? (
          <EmptyState message="暂无工单" />
        ) : (
          <>
            <JobsTable rows={paginatedRows} onToggleUrgent={toggleUrgent} />

            <JobsPagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </Card>
    </div>
  );
}
