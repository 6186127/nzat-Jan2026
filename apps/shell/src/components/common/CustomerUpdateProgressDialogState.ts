export type CustomerUpdateUiStatus = "pending" | "in_progress" | "success" | "failed";

export type CustomerUpdateStep = {
  status: CustomerUpdateUiStatus;
  message: string;
};

export type CustomerUpdateSteps = {
  replacement: CustomerUpdateStep;
  invoice: CustomerUpdateStep;
};

export type CustomerUpdateApiSteps = {
  replacement?: { status?: string; message?: string };
  invoice?: { status?: string; message?: string };
};

export function createInitialCustomerUpdateSteps(): CustomerUpdateSteps {
  return {
    replacement: {
      status: "in_progress",
      message: "正在更新 Job 的商户关联。",
    },
    invoice: {
      status: "pending",
      message: "等待更新 invoice Contact Name。",
    },
  };
}

export function resolveCustomerUpdateSteps(steps: CustomerUpdateApiSteps | undefined): CustomerUpdateSteps {
  const replacementStatus = normalizeStatus(steps?.replacement?.status, "success");
  const invoiceStatus = normalizeStatus(
    steps?.invoice?.status,
    replacementStatus === "failed" ? "pending" : "success"
  );

  return {
    replacement: {
      status: replacementStatus,
      message: steps?.replacement?.message || defaultMessage("replacement", replacementStatus),
    },
    invoice: {
      status: invoiceStatus,
      message: steps?.invoice?.message || defaultMessage("invoice", invoiceStatus),
    },
  };
}

function normalizeStatus(value: string | undefined, fallback: CustomerUpdateUiStatus): CustomerUpdateUiStatus {
  if (value === "pending" || value === "in_progress" || value === "success" || value === "failed") {
    return value;
  }

  return fallback;
}

function defaultMessage(target: "replacement" | "invoice", status: CustomerUpdateUiStatus) {
  if (target === "replacement") {
    if (status === "success") return "Job 的商户关联已更新。";
    if (status === "failed") return "Job 的商户关联更新失败。";
    if (status === "in_progress") return "正在更新 Job 的商户关联。";
    return "等待更新 Job 的商户关联。";
  }

  if (status === "success") return "Invoice Contact Name 已更新。";
  if (status === "failed") return "Invoice Contact Name 更新失败。";
  if (status === "in_progress") return "正在更新 invoice Contact Name。";
  return "等待更新 invoice Contact Name。";
}
