import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { JobDetailLayout, MainColumn, useJobDetailState } from "@/features/jobDetail";
import { RightSidebar } from "@/components/jobDetail/RightSidebar";
import { Alert, EmptyState } from "@/components/ui";
import type { JobDetailData } from "@/types";

export function JobDetailPage() {
  const { id } = useParams();
  const { activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen, hasWofRecord, setHasWofRecord } =
    useJobDetailState({ initialTab: "WOF" });
  const [jobData, setJobData] = useState<JobDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadJob = async () => {
      if (!id) {
        setLoadError("缺少工单 ID");
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(null);

      try {
        const res = await fetch(`/api/jobs/${encodeURIComponent(id)}`);
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.error || "加载工单失败");
        }

        const job = data?.job ?? data;

        if (!cancelled) {
          setJobData(job ?? null);
          if (typeof data?.hasWofRecord === "boolean") {
            setHasWofRecord(data.hasWofRecord);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "加载工单失败");
          setJobData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadJob();

    return () => {
      cancelled = true;
    };
  }, [id, setHasWofRecord]);

  if (loading) {
    return <div className="py-10 text-center text-sm text-[var(--ds-muted)]">加载中...</div>;
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <Alert variant="error" description={loadError} onClose={() => setLoadError(null)} />
        <EmptyState message="无法加载工单详情" />
      </div>
    );
  }

  if (!jobData) {
    return <EmptyState message="暂无工单详情" />;
  }

  return (
    <div className="space-y-4">
      <JobDetailLayout
        main={
          <MainColumn
            jobData={jobData}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            hasWofRecord={hasWofRecord}
            onAddWof={() => setHasWofRecord(true)}
          />
        }
        sidebar={
          <RightSidebar
            vehicle={jobData.vehicle}
            customer={jobData.customer}
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen((v) => !v)}
          />
        }
      />
    </div>
  );
}
