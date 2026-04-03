export type DeleteJobUiStatus = "pending" | "in_progress" | "success" | "failed";

export type DeleteJobApiStepResult = {
  status?: string;
  message?: string;
};

export type DeleteJobApiSteps = {
  xero?: DeleteJobApiStepResult;
  jobStep?: DeleteJobApiStepResult;
};

export type DeleteJobDialogStep = {
  status: DeleteJobUiStatus;
  message: string;
};

export type DeleteJobDialogSteps = {
  xero: DeleteJobDialogStep;
  job: DeleteJobDialogStep;
};

export function createInitialDeleteJobSteps(): DeleteJobDialogSteps {
  return {
    xero: {
      status: "pending",
      message: "等待开始删除 Xero draft。",
    },
    job: {
      status: "pending",
      message: "等待开始删除本地 Job。",
    },
  };
}

export function createDeletingDeleteJobSteps(): DeleteJobDialogSteps {
  return {
    xero: {
      status: "in_progress",
      message: "正在删除 Xero draft。",
    },
    job: {
      status: "pending",
      message: "等待删除本地 Job。",
    },
  };
}

export function resolveDeleteJobDialogSteps(
  steps: DeleteJobApiSteps | undefined,
  success: boolean
): DeleteJobDialogSteps {
  const xeroStatus = normalizeDeleteStepStatus(steps?.xero?.status, success ? "success" : "failed");
  const jobStatus = normalizeDeleteStepStatus(
    steps?.jobStep?.status,
    success ? "success" : xeroStatus === "failed" ? "pending" : "failed"
  );

  return {
    xero: {
      status: xeroStatus,
      message: steps?.xero?.message || defaultDeleteMessage("xero", xeroStatus),
    },
    job: {
      status: jobStatus,
      message: steps?.jobStep?.message || defaultDeleteMessage("job", jobStatus),
    },
  };
}

function normalizeDeleteStepStatus(
  value: string | undefined,
  fallback: DeleteJobUiStatus
): DeleteJobUiStatus {
  if (value === "success" || value === "failed" || value === "pending" || value === "in_progress") {
    return value;
  }

  return fallback;
}

function defaultDeleteMessage(target: "xero" | "job", status: DeleteJobUiStatus) {
  if (target === "xero") {
    if (status === "success") return "Xero draft 删除完成。";
    if (status === "failed") return "删除 Xero draft 失败。";
    if (status === "in_progress") return "正在删除 Xero draft。";
    return "等待删除 Xero draft。";
  }

  if (status === "success") return "本地 Job 删除完成。";
  if (status === "failed") return "删除本地 Job 失败。";
  if (status === "in_progress") return "正在删除本地 Job。";
  return "等待删除本地 Job。";
}
