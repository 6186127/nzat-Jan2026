import { Link, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { Card, Button, EmptyState, Alert, useToast } from "@/components/ui";
import { withApiBase } from "@/utils/api";
import { JobsFiltersCard } from "./JobsFiltersCard";
import { JobsTable } from "./JobsTable";
import { JobsPagination } from "./JobsPagination";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  useJobsQuery, JOBS_PAGE_SIZE, filtersToSearchParams,
  searchParamsToFilters,
  getPageFromSearchParams,
  DEFAULT_JOBS_FILTERS,
} from "@/features/jobs";
import { useJobSheetPrinter } from "@/features/printing/useJobSheetPrinter";
import type { TagOption } from "@/components/MultiTagSelect";
import {
  deleteJob,
  fetchJob,
  updateJobCreatedAt,
  updateJobStatus,
  updateJobTags,
} from "@/features/jobDetail/api/jobDetailApi";

export function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilters = searchParamsToFilters(searchParams);
  const initialPage = getPageFromSearchParams(searchParams);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tagOptions, setTagOptions] = useState<TagOption[]>([]);
  const toast = useToast();

  const buildCreatedAtWithDate = (prevValue: string, date: string) => {
    const datePart = date.replace(/-/g, "/");
    const timePart = prevValue.includes(" ") ? prevValue.split(" ")[1] : "00:00";
    return `${datePart} ${timePart}`;
  };

  const {
    filters,
    setFilters,
    paginatedRows,
    totalPages,
    totalItems,
    currentPage,
    setCurrentPage,
    pageSize,
    allRows,
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
        const res = await fetch(withApiBase("/api/jobs"));
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

          const tagsRes = await fetch(withApiBase(`/api/jobs/tags?ids=${encodeURIComponent(ids)}`));
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
            const hasUrgent = mergedTags.some((tag) => String(tag).toLowerCase() === "urgent");
            return { ...row, urgent: hasUrgent, selectedTags: mergedTags };
          });

          setAllRows(rowsWithTags);
        }
      } catch (err) {
        if (!cancelled) {
          setAllRows([]);
          const message = err instanceof Error ? err.message : "加载工单失败";
          setLoadError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadJobs();

    return () => {
      cancelled = true;
    };
  }, [setAllRows, toast]);

  useEffect(() => {
    let cancelled = false;

    const loadTags = async () => {
      try {
        const res = await fetch(withApiBase("/api/tags"));
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || "加载标签失败");
        }
        const tags = Array.isArray(data) ? data : [];
        if (!cancelled) {
          const activeTags = tags.filter(
            (tag: any) => tag?.isActive !== false && typeof tag?.name === "string"
          );
          setTagOptions(activeTags.map((tag: any) => ({ id: tag.name, label: tag.name })));
        }
      } catch {
        if (!cancelled) {
          setTagOptions([]);
        }
      }
    };

    loadTags();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggleUrgent = useCallback(
    async (id: string) => {
      const row = allRows.find((item) => item.id === id);
      if (!row) return;

      const currentTags = Array.isArray(row.selectedTags) ? row.selectedTags : [];
      const hasUrgent = currentTags.some((tag) => String(tag).toLowerCase() === "urgent");
      const requestedTags = hasUrgent
        ? currentTags.filter((tag) => String(tag).toLowerCase() !== "urgent")
        : Array.from(new Set([...currentTags, "Urgent"]));

      const res = await updateJobTags(id, [], requestedTags);
      if (!res.ok) {
        setLoadError(res.error || "更新加急标签失败");
        toast.error(res.error || "更新加急标签失败");
        return;
      }

      const resolvedTags: string[] = Array.isArray(res.data?.tags)
        ? res.data.tags.map((tag: unknown) => String(tag))
        : hasUrgent
          ? currentTags.filter((tag) => String(tag).toLowerCase() !== "urgent")
          : Array.from(new Set([...currentTags, "Urgent"]));

      const normalizedTags: string[] = Array.from(new Set(resolvedTags));
      const nextUrgent = normalizedTags.some((tag) => String(tag).toLowerCase() === "urgent");

      setAllRows((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                urgent: nextUrgent,
                selectedTags: normalizedTags,
              }
            : item
        )
      );
      toast.success(nextUrgent ? "已标记为加急" : "已取消加急");
    },
    [allRows, setAllRows, toast]
  );

  const handleArchive = useCallback(
    async (id: string) => {
      const res = await updateJobStatus(id, "Archived");
      if (!res.ok) {
        setLoadError(res.error || "归档失败");
        toast.error(res.error || "归档失败");
        return;
      }
      setAllRows((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                vehicleStatus: "Archived",
              }
            : item
        )
      );
      toast.success("已归档");
    },
    [setAllRows, toast]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const res = await deleteJob(id);
      if (!res.ok) {
        setLoadError(res.error || "删除失败");
        toast.error(res.error || "删除失败");
        return;
      }
      setAllRows((prev) => prev.filter((item) => item.id !== id));
      toast.success("已删除");
    },
    [setAllRows, toast]
  );

  const handleUpdateCreatedAt = useCallback(
    async (id: string, date: string) => {
      const res = await updateJobCreatedAt(id, date);
      if (!res.ok) {
        setLoadError(res.error || "更新创建日期失败");
        toast.error(res.error || "更新创建日期失败");
        return false;
      }
      setAllRows((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                createdAt: res.data?.createdAt
                  ? String(res.data.createdAt)
                  : buildCreatedAtWithDate(item.createdAt, date),
              }
            : item
        )
      );
      toast.success("创建日期已更新");
      return true;
    },
    [setAllRows, toast]
  );

  const resolveJobSheetData = useCallback(
    async (id: string) => {
      const row = allRows.find((item) => item.id === id);
      let notes = row?.notes ?? "";
      let mergedRow: any = row ?? {};

      const jobRes = await fetchJob(id);
      if (jobRes.ok) {
        const job = (jobRes.data as any)?.job ?? jobRes.data;

        // notes 兜底（保持你原逻辑）
        if (!notes) {
          notes = job?.notes ?? job?.customer?.notes ?? "";
        }

        // 新增字段兜底：如果列表 row 没有，就从 job 里补
        mergedRow = {
          ...(row ?? {}),
          nzFirstRegistration:
            (row as any)?.nzFirstRegistration ??
            job?.nzFirstRegistration ??
            job?.vehicle?.nzFirstRegistration ??
            job?.vehicle?.firstRegistration ??
            job?.vehicle?.nz_first_registration ??
            "",
          vin:
            (row as any)?.vin ??
            job?.vin ??
            job?.vehicle?.vin ??
            job?.vehicle?.vehicleVin ??
            job?.vehicle?.vehicle_vin ??
            "",
        };
      }

      return { row: mergedRow, notes };
    },
    [allRows, fetchJob]
  );

  const { printById } = useJobSheetPrinter({
    onPopupBlocked: () => toast.error("无法打开打印窗口，请允许弹窗"),
    resolveById: resolveJobSheetData,
  });

  const handlePrintTemplate = useCallback(
    async (id: string, type: "mech" | "paint") => {
      await printById(id, type);
    },
    [printById]
  );

  const handlePrintMech = useCallback(
    async (id: string) => handlePrintTemplate(id, "mech"),
    [handlePrintTemplate]
  );

  const handlePrintPaint = useCallback(
    async (id: string) => handlePrintTemplate(id, "paint"),
    [handlePrintTemplate]
  );

  return (
    <div className="space-y-4 text-[14px]">
      <h1 className="text-2xl font-semibold text-[rgba(0,0,0,0.72)]">Jobs</h1>

      {loadError ? (
        <Alert variant="error" description={loadError} onClose={() => setLoadError(null)} />
      ) : null}

      <JobsFiltersCard value={filters} onChange={setFilters} onReset={onReset} tagOptions={tagOptions} />

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
            <JobsTable
              rows={paginatedRows}
              onToggleUrgent={handleToggleUrgent}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onUpdateCreatedAt={handleUpdateCreatedAt}
              onPrintMech={handlePrintMech}
              onPrintPaint={handlePrintPaint}
            />

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
