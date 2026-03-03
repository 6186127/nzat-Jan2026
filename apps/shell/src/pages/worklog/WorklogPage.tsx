import { useEffect, useMemo, useState } from "react";
import { requestJson } from "@/utils/api";
import { StaffManagement } from "@/features/worklog/components/StaffManagement";
import { WorkLogTable } from "@/features/worklog/components/WorkLogTable";
import { initialWorklogEntries, worklogJobs, worklogStaffProfiles } from "@/features/worklog/mockData";
import { buildStaffColorMap, detectFlags, formatDateTime } from "@/features/worklog/worklog.utils";
import type { WorklogEntry, WorklogFlag, WorklogJob, WorklogStaffProfile } from "@/features/worklog/types";

export function WorklogPage() {
  const [logs, setLogs] = useState<WorklogEntry[]>(() =>
    initialWorklogEntries.map((log) => ({
      ...log,
      flags: log.flagDismissed ? [] : detectFlags(log, initialWorklogEntries),
    }))
  );
  const [staffList, setStaffList] = useState<WorklogStaffProfile[]>(worklogStaffProfiles);
  const [nextId, setNextId] = useState(initialWorklogEntries.length + 1);
  const [nextStaffId, setNextStaffId] = useState(worklogStaffProfiles.length + 1);
  const [apiJobs, setApiJobs] = useState<WorklogJob[]>([]);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadJobs = async () => {
      const res = await requestJson<any[]>("/api/jobs");
      if (!res.ok || !Array.isArray(res.data) || cancelled) return;
      setApiJobs(
        res.data
          .filter((job) => job?.id && job?.plate)
          .map((job) => ({
            id: String(job.id),
            rego: String(job.plate),
            note: String(job.notes ?? ""),
            created_date: String(job.createdAt ?? "").slice(0, 10).replace(/\//g, "-"),
          }))
      );
    };

    void loadJobs();
    return () => {
      cancelled = true;
    };
  }, []);

  const jobs = useMemo(() => {
    const merged = new Map<string, WorklogJob>();
    [...worklogJobs, ...apiJobs].forEach((job) => {
      merged.set(job.rego, job);
    });
    return Array.from(merged.values());
  }, [apiJobs]);

  const staffColorMap = useMemo(
    () => buildStaffColorMap(staffList.map((staff) => staff.name)),
    [staffList]
  );

  const recalculateFlags = (entries: WorklogEntry[]) =>
    entries.map((log) => ({
      ...log,
      flags: log.flagDismissed ? [] : detectFlags(log, entries),
    }));

  const handleAddLog = (newLog: Omit<WorklogEntry, "id" | "created_at" | "created_by" | "flags">) => {
    const log: WorklogEntry = {
      ...newLog,
      id: String(nextId),
      created_at: formatDateTime(new Date()),
      created_by: "admin",
      flags: [],
    };
    const updated = recalculateFlags([...logs, log]);
    setLogs(updated);
    setEditingLogId(null);
    setNextId((prev) => prev + 1);
  };

  const handleEditLog = (id: string, updates: Partial<WorklogEntry>) => {
    const updated = recalculateFlags(logs.map((log) => (log.id === id ? { ...log, ...updates } : log)));
    setLogs(updated);
    setEditingLogId((prev) => (prev === id ? null : prev));
  };

  const handleCopyLog = (log: WorklogEntry) => {
    const copiedId = String(nextId);
    const copied: WorklogEntry = {
      ...log,
      id: copiedId,
      created_at: formatDateTime(new Date()),
      created_by: "admin",
      flagDismissed: false,
      flags: [],
    };
    const updated = recalculateFlags([...logs, copied]);
    setLogs(updated);
    setEditingLogId(copiedId);
    setNextId((prev) => prev + 1);
  };

  const handleDismissFlag = (id: string, flag: WorklogFlag) => {
    setLogs((prev) =>
      prev.map((log) =>
        log.id === id
          ? {
              ...log,
              flags: log.flags.filter((item) => item !== flag),
              flagDismissed: log.flags.length === 1 ? true : log.flagDismissed,
            }
          : log
      )
    );
  };

  const handleAddStaff = (newStaff: Omit<WorklogStaffProfile, "id">) => {
    setStaffList((prev) => [...prev, { ...newStaff, id: String(nextStaffId) }]);
    setNextStaffId((prev) => prev + 1);
  };

  const handleEditStaff = (id: string, updates: Partial<WorklogStaffProfile>) => {
    setStaffList((prev) => prev.map((staff) => (staff.id === id ? { ...staff, ...updates } : staff)));
  };

  const handleDeleteStaff = (id: string) => {
    setStaffList((prev) => prev.filter((staff) => staff.id !== id));
  };

  const handleDeleteLog = (id: string) => {
    setLogs((prev) => recalculateFlags(prev.filter((log) => log.id !== id)));
  };

  return (
    <div
      className="min-h-full space-y-4 bg-white text-[14px]"
      style={{
        fontFamily: '"Manrope","Plus Jakarta Sans","Space Grotesk","Segoe UI",sans-serif',
      }}
    >
      <div className="mx-auto max-w-[1800px]">
        <h1 className="text-2xl font-semibold text-[rgba(0,0,0,0.72)]">工时明细列表</h1>

        <StaffManagement
          staffProfiles={staffList}
          staffColorMap={staffColorMap}
          onAddStaff={handleAddStaff}
          onEditStaff={handleEditStaff}
          onDeleteStaff={handleDeleteStaff}
        />

        <WorkLogTable
          logs={logs}
          staffProfiles={staffList}
          jobs={jobs}
          staffColorMap={staffColorMap}
          editingLogId={editingLogId}
          onAddLog={handleAddLog}
          onEditLog={handleEditLog}
          onCopyLog={handleCopyLog}
          onDismissFlag={handleDismissFlag}
          onDeleteLog={handleDeleteLog}
        />
      </div>
    </div>
  );
}
