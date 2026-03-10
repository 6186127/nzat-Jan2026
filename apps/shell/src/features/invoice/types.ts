export type InvoiceStatus =
  | "Draft"
  | "Awaiting PO"
  | "PO Received"
  | "Awaiting Payment"
  | "Authorised";

export type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tax: number;
};

export type EmailState = "Email Sent" | "Waiting for Reply" | "Reminder Scheduled";

export type EmailTimelineEventType =
  | "sent"
  | "reminder"
  | "reply"
  | "detected"
  | "confirmed"
  | "updated";

export type EmailTimelineEvent = {
  id: string;
  type: EmailTimelineEventType;
  timestamp: string;
  description: string;
};

export type PoSource = "email" | "pdf" | "ocr";

export type PoDetection = {
  id: string;
  poNumber: string;
  source: PoSource;
  confidence: number;
  evidencePreview: string;
  previewLabel: string;
  previewType: "pdf" | "image";
  status: "pending" | "confirmed" | "rejected";
};

export type WorkflowStep = {
  id: number;
  title: string;
  description: string;
};

export type InvoiceDashboardState = {
  xeroInvoiceId: string;
  status: InvoiceStatus;
  lastSyncTime: string;
  synced: boolean;
  merchantEmail: string;
  correlationId: string;
  snapshotTotal: number;
  emailStates: EmailState[];
  remindersSent: number;
  reminderLimit: number;
  lastEmailSent: string;
  lastReplyReceived: string;
  nextReminderIn: string;
  currentWorkflowStep: number;
};
