import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import { Button, Input, Select, useToast } from "@/components/ui";
import { calculateWage, formatDate, isValidTimeValue, parseTimeRange } from "../worklog.utils";
import type {
  WorklogEntry,
  WorklogJob,
  WorklogSource,
  WorklogStaffProfile,
  WorklogTaskType,
} from "../types";

type Props = {
  staffProfiles: WorklogStaffProfile[];
  jobs: WorklogJob[];
  onAdd: (log: Omit<WorklogEntry, "id" | "created_at" | "created_by" | "flags">) => void;
};

const TASK_OPTIONS: WorklogTaskType[] = ["喷漆", "抛光", "拆装", "打磨", "检查", "清洁"];

export function WorkLogAddRow({ staffProfiles, jobs, onAdd }: Props) {
  const toast = useToast();
  const [staffName, setStaffName] = useState("");
  const [rego, setRego] = useState("");
  const [regoInput, setRegoInput] = useState("");
  const [showRegoSuggestions, setShowRegoSuggestions] = useState(false);
  const [taskTypes, setTaskTypes] = useState<WorklogTaskType[]>([]);
  const [workDate, setWorkDate] = useState(formatDate(new Date()));
  const [timeRange, setTimeRange] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [source, setSource] = useState<WorklogSource>("admin");

  const selectedStaff = useMemo(
    () => staffProfiles.find((item) => item.name === staffName),
    [staffProfiles, staffName]
  );
  const selectedJob = useMemo(() => jobs.find((item) => item.rego === rego), [jobs, rego]);
  const filteredJobs = useMemo(() => {
    if (!regoInput) return [];
    return jobs.filter((job) => job.rego.toLowerCase().includes(regoInput.toLowerCase())).slice(0, 8);
  }, [jobs, regoInput]);
  const wage = useMemo(
    () => calculateWage(startTime, endTime, selectedStaff?.cost_rate || 0).toFixed(2),
    [endTime, selectedStaff?.cost_rate, startTime]
  );

  const handleTaskTypeToggle = (taskType: WorklogTaskType) => {
    setTaskTypes((prev) =>
      prev.includes(taskType) ? prev.filter((item) => item !== taskType) : [...prev, taskType]
    );
  };

  const handleSave = () => {
    if (!staffName || !rego || !startTime || !endTime) {
      toast.error("请填写必填项：员工姓名、车牌号、开始时间、结束时间");
      return;
    }
    if (!isValidTimeValue(startTime) || !isValidTimeValue(endTime)) {
      toast.error("开始时间和结束时间格式必须为 HH:MM");
      return;
    }
    if (endTime <= startTime) {
      toast.error("结束时间必须晚于开始时间");
      return;
    }

    onAdd({
      staff_name: staffName,
      team: "",
      role: selectedStaff?.role || "Technician",
      rego,
      job_id: selectedJob?.id,
      job_note: selectedJob?.note || "",
      task_types: taskTypes,
      work_date: workDate,
      start_time: startTime,
      end_time: endTime,
      cost_rate: selectedStaff?.cost_rate || 0,
      admin_note: adminNote,
      source,
      flagDismissed: false,
    });

    setStaffName("");
    setRego("");
    setRegoInput("");
    setTaskTypes([]);
    setWorkDate(formatDate(new Date()));
    setTimeRange("");
    setStartTime("");
    setEndTime("");
    setAdminNote("");
    setSource("admin");
    setShowRegoSuggestions(false);
    toast.success("工时记录已保存");
  };

  return (
    <tr className="border-b-2 border-blue-200 bg-blue-50">
      <td className="px-4 py-3 text-sm text-slate-600">新增</td>
      <td className="px-4 py-3">
        <Select value={staffName} onChange={(event) => setStaffName(event.target.value)} className="bg-white text-sm">
          <option value="">选择员工</option>
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
      <td className="relative overflow-visible px-4 py-3">
        <Input
          value={regoInput}
          onChange={(event) => {
            setRegoInput(event.target.value);
            setShowRegoSuggestions(true);
          }}
          onFocus={() => setShowRegoSuggestions(true)}
          placeholder="输入车牌号"
          className="bg-white text-sm"
        />
        {showRegoSuggestions && filteredJobs.length > 0 ? (
          <div className="absolute left-4 right-4 top-[calc(100%-4px)] z-[60] max-h-40 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
            {filteredJobs.map((job) => (
              <button
                type="button"
                key={job.id}
                onClick={() => {
                  setRego(job.rego);
                  setRegoInput(job.rego);
                  setShowRegoSuggestions(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
              >
                {job.rego} ({job.created_date})
              </button>
            ))}
          </div>
        ) : null}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">{selectedJob?.note || "-"}</td>
      <td className="px-4 py-3">
        <Input type="date" value={workDate} onChange={(event) => setWorkDate(event.target.value)} className="text-sm" />
      </td>
      <td className="px-4 py-3" colSpan={2}>
        <Input
          value={timeRange}
          onChange={(event) => {
            const value = event.target.value;
            setTimeRange(value);
            const parsed = parseTimeRange(value);
            if (parsed) {
              setStartTime(parsed.start);
              setEndTime(parsed.end);
            }
          }}
          placeholder="如: 9.30-10.40"
          className="text-sm"
        />
        {startTime && endTime ? (
          <div className="mt-1 text-xs text-slate-500">
            {startTime} - {endTime}
          </div>
        ) : null}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">${selectedStaff?.cost_rate || 0}</td>
      <td className="px-4 py-3 text-sm font-medium text-slate-700">${wage}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {TASK_OPTIONS.map((type) => (
            <button
              type="button"
              key={type}
              onClick={() => handleTaskTypeToggle(type)}
              className={`rounded-md px-2 py-1 text-xs transition-colors ${
                taskTypes.includes(type)
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
          value={adminNote}
          onChange={(event) => setAdminNote(event.target.value)}
          placeholder="备注"
          className="text-sm"
        />
      </td>
      <td className="px-4 py-3">
        <Select value={source} onChange={(event) => setSource(event.target.value as WorklogSource)} className="bg-white text-sm">
          <option value="admin">Admin</option>
          <option value="tech">Tech</option>
        </Select>
      </td>
      <td className="px-4 py-3">
        <Button onClick={handleSave} variant="primary" className="h-9" leftIcon={<Save className="size-4" />}>
          保存
        </Button>
      </td>
    </tr>
  );
}
