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

const escapeHtml = (value?: string) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildPrintHtml = (type: "mech" | "paint", row: any, notes: string) => {
  const title = type === "mech" ? "机修工单" : "喷漆工单";
  const date = new Date().toLocaleString();
  const noteText = notes?.trim() ? notes : "—";
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
      h1 { font-size: 22px; margin: 0 0 8px; }
      .sub { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
      .grid { display: grid; grid-template-columns: 140px 1fr; gap: 6px 16px; font-size: 14px; }
      .label { color: #6b7280; }
      .section { margin-top: 18px; }
      .notes { min-height: 120px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; white-space: pre-wrap; }
      @media print { .no-print { display: none; } }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    <div class="sub">打印时间：${escapeHtml(date)}</div>
    <div class="grid">
      <div class="label">Job ID</div><div>${escapeHtml(row?.id)}</div>
      <div class="label">车牌号</div><div>${escapeHtml(row?.plate)}</div>
      <div class="label">车型</div><div>${escapeHtml(row?.vehicleModel)}</div>
      <div class="label">客户</div><div>${escapeHtml(row?.customerCode || row?.customerName)}</div>
      <div class="label">电话</div><div>${escapeHtml(row?.customerPhone)}</div>
      <div class="label">创建时间</div><div>${escapeHtml(row?.createdAt)}</div>
    </div>
    <div class="section">
      <div class="label">备注</div>
      <div class="notes">${escapeHtml(noteText)}</div>
    </div>
  </body>
</html>`;
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

  const handlePrintTemplate = useCallback(
    async (id: string, type: "mech" | "paint") => {
      const row = allRows.find((item) => item.id === id);
      const popup = window.open("", "_blank", "width=900,height=650");
      if (!popup) {
        toast.error("无法打开打印窗口，请允许弹窗");
        return;
      }
      popup.document.write("<html><body>Loading...</body></html>");
      popup.document.close();

      let notes = row?.notes ?? "";
      if (!notes) {
        const jobRes = await fetchJob(id);
        if (jobRes.ok) {
          const job = (jobRes.data as any)?.job ?? jobRes.data;
          notes = job?.notes ?? job?.customer?.notes ?? "";
        }
      }

      const html = buildPrintHtml(type, row, notes);
      popup.document.open();
      popup.document.write(html);
      popup.document.close();
      popup.focus();
      setTimeout(() => popup.print(), 50);
    },
    [allRows, toast]
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
