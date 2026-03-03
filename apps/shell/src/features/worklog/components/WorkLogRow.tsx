import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Copy, Edit, Trash2 } from "lucide-react";
import { Button, Input, Select, useToast } from "@/components/ui";
import {
  calculateWage,
  flagLabel,
  getStaffPillColor,
  getStaffRowColor,
  isValidTimeValue,
} from "../worklog.utils";
import type {
  WorklogEntry,
  WorklogFlag,
  WorklogJob,
  WorklogSource,
  WorklogStaffProfile,
  WorklogTaskType,
} from "../types";
import { Link } from "react-router-dom";

type Props = {
  log: WorklogEntry;
  staffProfiles: WorklogStaffProfile[];
  jobs: WorklogJob[];
  staffColorMap: Map<string, { pill: string; row: string }>;
  forceEditing?: boolean;
  onEdit: (updates: Partial<WorklogEntry>) => void;
  onCopy: () => void;
  onDismissFlag: (flag: WorklogFlag) => void;
  onDelete: () => void;
};

const TASK_OPTIONS: WorklogTaskType[] = ["喷漆", "抛光", "拆装", "打磨", "检查", "清洁"];

export function WorkLogRow({
  log,
  staffProfiles,
  jobs,
  staffColorMap,
  forceEditing = false,
  onEdit,
  onCopy,
  onDismissFlag,
  onDelete,
}: Props) {
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<WorklogEntry>(log);

  const selectedStaff = useMemo(
    () => staffProfiles.find((item) => item.name === editData.staff_name),
    [editData.staff_name, staffProfiles]
  );
  const selectedJob = useMemo(() => jobs.find((item) => item.rego === editData.rego), [editData.rego, jobs]);
  const staffPillColor = useMemo(
    () => getStaffPillColor(log.staff_name, staffColorMap),
    [log.staff_name, staffColorMap]
  );
  const rowColor = useMemo(
    () => getStaffRowColor(log.staff_name, staffColorMap),
    [log.staff_name, staffColorMap]
  );
  const wage = useMemo(
    () => calculateWage(log.start_time, log.end_time, log.cost_rate).toFixed(2),
    [log.cost_rate, log.end_time, log.start_time]
  );

  const handleTaskTypeToggle = (taskType: WorklogTaskType) => {
    setEditData((prev) => ({
      ...prev,
      task_types: prev.task_types.includes(taskType)
        ? prev.task_types.filter((item) => item !== taskType)
        : [...prev.task_types, taskType],
    }));
  };

  useEffect(() => {
    if (!forceEditing) return;
    setEditData(log);
    setIsEditing(true);
  }, [forceEditing, log]);

  const saveEdit = () => {
    if (!editData.staff_name || !editData.rego || !editData.start_time || !editData.end_time) {
      toast.error("请填写必填项：员工姓名、车牌号、开始时间、结束时间");
      return;
    }
    if (!isValidTimeValue(editData.start_time) || !isValidTimeValue(editData.end_time)) {
      toast.error("开始时间和结束时间格式必须为 HH:MM");
      return;
    }
    if (editData.end_time <= editData.start_time) {
      toast.error("结束时间必须晚于开始时间");
      return;
    }
    onEdit(editData);
    setIsEditing(false);
    toast.success("工时记录已更新");
  };

  if (isEditing) {
    return (
      <tr className="border-b border-slate-200 hover:bg-slate-50">
        <td className="px-4 py-3 text-sm text-slate-600">{log.id}</td>
        <td className="px-4 py-3">
          <Select
            value={editData.staff_name}
            onChange={(event) => {
              const nextName = event.target.value;
              const staff = staffProfiles.find((item) => item.name === nextName);
              setEditData((prev) => ({
                ...prev,
                staff_name: nextName,
                team: "",
                role: staff?.role || prev.role,
                cost_rate: staff?.cost_rate || prev.cost_rate,
              }));
            }}
            className="text-sm"
          >
            {staffProfiles.map((staff) => (
              <option key={staff.id} value={staff.name}>
                {staff.name}
              </option>
            ))}
          </Select>
        </td>
        <td className="px-4 py-3 text-sm text-slate-600">
          {selectedStaff ? selectedStaff.role : "-"}
        </td>
        <td className="px-4 py-3">
          <Input
            value={editData.rego}
            onChange={(event) => {
              const value = event.target.value.toUpperCase();
              const job = jobs.find((item) => item.rego === value);
              setEditData((prev) => ({
                ...prev,
                rego: value,
                job_id: job?.id,
                job_note: job?.note || prev.job_note,
              }));
            }}
            className="text-sm"
          />
        </td>
        <td className="px-4 py-3 text-sm text-slate-600">{selectedJob?.note || editData.job_note}</td>
        <td className="px-4 py-3">
          <Input
            type="date"
            value={editData.work_date}
            onChange={(event) => setEditData((prev) => ({ ...prev, work_date: event.target.value }))}
            className="text-sm"
          />
        </td>
        <td className="px-4 py-3">
          <Input
            type="time"
            value={editData.start_time}
            onChange={(event) => setEditData((prev) => ({ ...prev, start_time: event.target.value }))}
            className="text-sm"
          />
        </td>
        <td className="px-4 py-3">
          <Input
            type="time"
            value={editData.end_time}
            onChange={(event) => setEditData((prev) => ({ ...prev, end_time: event.target.value }))}
            className="text-sm"
          />
        </td>
        <td className="px-4 py-3">
          <Input
            type="number"
            value={editData.cost_rate}
            onChange={(event) =>
              setEditData((prev) => ({ ...prev, cost_rate: Number(event.target.value || 0) }))
            }
            className="text-sm"
          />
        </td>
        <td className="px-4 py-3 text-sm font-medium text-slate-700">
          ${calculateWage(editData.start_time, editData.end_time, editData.cost_rate).toFixed(2)}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {TASK_OPTIONS.map((type) => (
              <button
                type="button"
                key={type}
                onClick={() => handleTaskTypeToggle(type)}
                className={`rounded-md px-2 py-1 text-xs transition-colors ${
                  editData.task_types.includes(type)
                    ? "bg-blue-500 text-white"
                    : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </td>
        <td className="px-4 py-3">
          <Input
            value={editData.admin_note}
            onChange={(event) => setEditData((prev) => ({ ...prev, admin_note: event.target.value }))}
            className="text-sm"
          />
        </td>
        <td className="px-4 py-3">
          <Select
            value={editData.source}
            onChange={(event) => setEditData((prev) => ({ ...prev, source: event.target.value as WorklogSource }))}
            className="text-sm"
          >
            <option value="admin">Admin</option>
            <option value="tech">Tech</option>
          </Select>
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-1">
            <Button onClick={saveEdit} className="h-8 px-3">
              保存
            </Button>
            <Button onClick={() => { setEditData(log); setIsEditing(false); }} className="h-8 px-3">
              取消
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`border-b border-slate-200 hover:bg-slate-50 ${rowColor}`}>
      <td className="px-4 py-3 text-sm text-slate-600">{log.id}</td>
      <td className="px-4 py-3">
        <span className={`inline-block rounded-full border px-3 py-1 text-sm font-medium ${staffPillColor}`}>
          {log.staff_name}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">
        {log.role}
      </td>
      <td className="px-4 py-3">
        {log.job_id ? (
          <Link to={`/jobs/${log.job_id}`} className="text-sm text-blue-600 hover:underline">
            {log.rego}
          </Link>
        ) : (
          <span className="text-sm text-slate-700">{log.rego}</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">{log.job_note}</td>
      <td className="px-4 py-3">
        <div className="text-sm text-slate-600">{log.work_date}</div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">{log.start_time}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{log.end_time}</td>
      <td className="px-4 py-3 text-sm text-slate-600">${log.cost_rate}</td>
      <td className="px-4 py-3 text-sm font-medium text-slate-700">${wage}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {log.task_types.map((type) => (
            <span key={type} className="inline-block rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">
              {type}
            </span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">{log.admin_note}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{log.source}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setIsEditing(true)} className="rounded-md p-2 hover:bg-white">
            <Edit className="size-4" />
          </button>
          <button type="button" onClick={onCopy} className="rounded-md p-2 hover:bg-white">
            <Copy className="size-4" />
          </button>
          <button type="button" onClick={onDelete} className="rounded-md p-2 hover:bg-white">
            <Trash2 className="size-4 text-red-600" />
          </button>
          {log.flagDismissed || log.flags.length === 0 ? null : (
            <button
              type="button"
              onClick={() => log.flags.forEach((flag) => onDismissFlag(flag))}
              className="rounded-md p-2 text-red-500 hover:bg-red-50 hover:text-red-700"
              title={`${log.flags.map((flag) => flagLabel(flag)).join("，")}，点击解除标记`}
            >
              <AlertTriangle className="size-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
