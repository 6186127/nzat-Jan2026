import { useEffect, useMemo, useState } from "react";
import { Pagination } from "@/components/ui";
import { paginate } from "@/utils/pagination";
import { WorkLogAddRow } from "./WorkLogAddRow";
import { WorkLogRow } from "./WorkLogRow";
import type { WorklogEntry, WorklogFlag, WorklogJob, WorklogStaffProfile } from "../types";

type Props = {
  logs: WorklogEntry[];
  staffProfiles: WorklogStaffProfile[];
  jobs: WorklogJob[];
  staffColorMap: Map<string, { pill: string; row: string }>;
  editingLogId: string | null;
  onAddLog: (log: Omit<WorklogEntry, "id" | "created_at" | "created_by" | "flags">) => void;
  onEditLog: (id: string, updates: Partial<WorklogEntry>) => void;
  onCopyLog: (log: WorklogEntry) => void;
  onDismissFlag: (id: string, flag: WorklogFlag) => void;
  onDeleteLog: (id: string) => void;
};

const ITEMS_PER_PAGE = 10;

export function WorkLogTable({
  logs,
  staffProfiles,
  jobs,
  staffColorMap,
  editingLogId,
  onAddLog,
  onEditLog,
  onCopyLog,
  onDismissFlag,
  onDeleteLog,
}: Props) {
  const [currentPage, setCurrentPage] = useState(1);

  const groupedLogs = useMemo(() => {
    const staffOrder = new Map(staffProfiles.map((staff, index) => [staff.name, index]));
    const latestLogByStaff = new Map<string, number>();

    logs.forEach((log) => {
      const createdAt = new Date(log.created_at).getTime();
      const prev = latestLogByStaff.get(log.staff_name) ?? 0;
      if (createdAt > prev) {
        latestLogByStaff.set(log.staff_name, createdAt);
      }
    });

    return [...logs].sort((a, b) => {
      if (a.staff_name !== b.staff_name) {
        const latestDiff =
          (latestLogByStaff.get(b.staff_name) ?? 0) - (latestLogByStaff.get(a.staff_name) ?? 0);
        if (latestDiff !== 0) return latestDiff;

        return (staffOrder.get(a.staff_name) ?? Number.MAX_SAFE_INTEGER) -
          (staffOrder.get(b.staff_name) ?? Number.MAX_SAFE_INTEGER);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [logs, staffProfiles]);

  const pagination = paginate(groupedLogs, currentPage, ITEMS_PER_PAGE);

  useEffect(() => {
    if (pagination.currentPage !== currentPage) {
      setCurrentPage(pagination.currentPage);
    }
  }, [currentPage, pagination.currentPage]);

  useEffect(() => {
    if (editingLogId) {
      setCurrentPage(1);
    }
  }, [editingLogId]);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto overflow-y-visible rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[1560px] border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">员工姓名</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">团队/角色</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">车牌号</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">工作备注</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">工作日期</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">开始时间</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">结束时间</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">时薪</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">工资</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">任务类型</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">管理备注</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">来源</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">操作</th>
            </tr>
            <WorkLogAddRow staffProfiles={staffProfiles} jobs={jobs} onAdd={onAddLog} />
          </thead>
          <tbody>
            {pagination.pageRows.map((log) => (
              <WorkLogRow
                key={log.id}
                log={log}
                staffProfiles={staffProfiles}
                jobs={jobs}
                staffColorMap={staffColorMap}
                forceEditing={editingLogId === log.id}
                onEdit={(updates) => onEditLog(log.id, updates)}
                onCopy={() => onCopyLog(log)}
                onDismissFlag={(flag) => onDismissFlag(log.id, flag)}
                onDelete={() => onDeleteLog(log.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        pageSize={ITEMS_PER_PAGE}
        totalItems={pagination.totalItems}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
