import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui";
import { requestJson } from "@/utils/api";
import {
  initialInvoiceItems,
  initialInvoiceState,
  initialItemCatalog,
  initialPoDetections,
} from "../mockData";
import type { EmailState, EmailTimelineEvent, InvoiceItem, MerchantEmailRecipient, TaxRateOption } from "../types";
import type { CustomerInfo, VehicleInfo } from "@/types";

const TAX_RATE_PERCENTAGE: Record<TaxRateOption, number> = {
  "15% GST on Expenses": 15,
  "15% GST on Income": 15,
  "GST on Imports": 15,
  "No GST": 0,
  "Zero Rated": 0,
  "Zero Rated - Exp": 0,
};

function createNewItem(nextId: number): InvoiceItem {
  return {
    id: `line-${nextId}`,
    itemCode: "",
    description: "New invoice line item",
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    account: "",
    taxRate: "15% GST on Income",
  };
}

function getBaseAmount(item: InvoiceItem) {
  return item.quantity * item.unitPrice * (1 - item.discount / 100);
}

function getTaxAmount(item: InvoiceItem) {
  return getBaseAmount(item) * (TAX_RATE_PERCENTAGE[item.taxRate] / 100);
}

function buildReference(currentReference: string, poNumber: string) {
  const trimmedPo = poNumber.trim();
  if (!trimmedPo) return currentReference;
  const slashIndex = currentReference.indexOf("/");
  if (slashIndex === -1) return trimmedPo;
  return `${trimmedPo} ${currentReference.slice(slashIndex)}`;
}

const EMAIL_STATE_ORDER: EmailState[] = ["Draft", "Email Sent", "Get Reply", "Reminder Scheduled", "Get PO"];

function mergeEmailStates(current: EmailState[], add: EmailState[], remove: EmailState[] = []): EmailState[] {
  const next = new Set(current);
  remove.forEach((state) => next.delete(state));
  add.forEach((state) => next.add(state));
  return EMAIL_STATE_ORDER.filter((state) => next.has(state));
}

type UseInvoiceDashboardStateArgs = {
  jobId?: string;
  customer?: CustomerInfo | null;
  vehicle?: VehicleInfo | null;
};

function buildCorrelationId(jobId?: string, vehicle?: VehicleInfo | null) {
  const normalizedJobId = (jobId ?? "").trim();
  if (normalizedJobId) {
    const suffix = buildStableAlphaSuffix(normalizedJobId);
    return `PO-${normalizedJobId}-${suffix}`;
  }

  const plate = (vehicle?.plate ?? "").trim().replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return plate ? `PO-REGO-${plate}` : "PO-UNASSIGNED";
}

function buildStableAlphaSuffix(seed: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  let suffix = "";
  let value = hash || 1;
  for (let index = 0; index < 4; index += 1) {
    suffix += alphabet[value % alphabet.length];
    value = Math.floor(value / alphabet.length) || (hash + index + 7);
  }

  return suffix;
}

export function useInvoiceDashboardState({ jobId, customer, vehicle }: UseInvoiceDashboardStateArgs = {}) {
  const toast = useToast();
  const [invoice, setInvoice] = useState(initialInvoiceState);
  const [items, setItems] = useState(initialInvoiceItems);
  const [itemCatalog, setItemCatalog] = useState(initialItemCatalog);
  const [timeline, setTimeline] = useState<EmailTimelineEvent[]>([]);
  const [detections, setDetections] = useState(initialPoDetections);
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(null);
  const [nextItemId, setNextItemId] = useState(initialInvoiceItems.length + 1);
  const [itemCatalogSyncState, setItemCatalogSyncState] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [itemCatalogFeedback, setItemCatalogFeedback] = useState<string | null>(null);
  const [itemCatalogLastUpdated, setItemCatalogLastUpdated] = useState<string | null>(null);
  const [itemsDirty, setItemsDirty] = useState(!initialInvoiceState.synced);
  const [pendingFocusRowId, setPendingFocusRowId] = useState<string | null>(null);
  const [manualPoNumber, setManualPoNumber] = useState("");
  const resolvedCorrelationId = useMemo(() => buildCorrelationId(jobId, vehicle), [jobId, vehicle]);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + getBaseAmount(item), 0), [items]);
  const taxTotal = useMemo(() => items.reduce((sum, item) => sum + getTaxAmount(item), 0), [items]);
  const totalAmount = useMemo(() => subtotal + taxTotal, [subtotal, taxTotal]);

  const updateItem = (id: string, field: keyof InvoiceItem, value: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === "itemCode") {
          const code = value.split(" - ")[0].trim();
          const matched = itemCatalog.find((entry) => entry.code === code);
          if (matched) {
            return {
              ...item,
              itemCode: matched.code,
              description: matched.name,
              unitPrice: matched.unitPrice,
              account: matched.account,
              taxRate: matched.taxRate,
            };
          }
          return { ...item, itemCode: value };
        }
        if (field === "description" || field === "account" || field === "taxRate") {
          return { ...item, [field]: value };
        }
        const parsed = Number(value || 0);
        return { ...item, [field]: Number.isFinite(parsed) ? parsed : 0 };
      })
    );
    setInvoice((prev) => ({ ...prev, synced: false }));
    setItemsDirty(true);
  };

  const addItem = () => {
    const newId = `line-${nextItemId}`;
    setItems((prev) => [...prev, createNewItem(nextItemId)]);
    setNextItemId((prev) => prev + 1);
    setPendingFocusRowId(newId);
    setInvoice((prev) => ({ ...prev, synced: false }));
    setItemsDirty(true);
    toast.info("Added a new invoice item row");
  };

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setInvoice((prev) => ({ ...prev, synced: false }));
    setItemsDirty(true);
    toast.info("Invoice item removed");
  };

  const syncInvoice = () => {
    if (!itemsDirty) return;
    const now = new Date().toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-");
    setInvoice((prev) => ({
      ...prev,
      snapshotTotal: totalAmount,
      synced: true,
      status: prev.status === "Draft" ? "Awaiting PO" : prev.status,
      lastSyncTime: now,
      lastSyncDirection: "System -> Xero",
      currentWorkflowStep: Math.max(prev.currentWorkflowStep, 2),
    }));
    setItemsDirty(false);
    setTimeline((prev) => [
      {
        id: `evt-sync-${Date.now()}`,
        type: "updated",
        timestamp: now,
        description: "Invoice synced to Xero successfully",
      },
      ...prev,
    ]);
    toast.success("Invoice synced with Xero");
  };

  const openInXero = () => {
    window.open("https://go.xero.com", "_blank", "noopener,noreferrer");
  };

  const refreshItemCatalog = () => {
    if (itemCatalogSyncState === "syncing") return;
    const startedAt = new Date().toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-");
    setItemCatalogSyncState("syncing");
    setItemCatalogFeedback("Syncing item list from Xero. Existing invoice rows stay untouched until you choose an item.");
    toast.info("Refreshing Xero item list...");

    window.setTimeout(() => {
      setItemCatalog((prev) => {
        const existing = new Set(prev.map((item) => item.code));
        return existing.has("LAB-320")
          ? prev
          : [
              ...prev,
              {
                code: "LAB-320",
                name: "Battery Health Check",
                unitPrice: 72,
                account: "200 - Sales",
                taxRate: "15% GST on Income",
              },
            ];
      });
      setItemCatalogSyncState("success");
      setItemCatalogLastUpdated(startedAt);
      setItemCatalogFeedback("Xero item list updated. New item definitions are ready for manual selection in the Item column.");
      toast.success("Xero item list updated");
    }, 900);
  };

  const sendPoRequest = async ({ to, subject, body }: { to: string; subject: string; body: string }) => {
    const latestThreadEvent = timeline.find((event) => ["sent", "reminder", "reply"].includes(event.type));
    const result = await requestJson<{
      id: string;
      threadId: string;
      message: string;
      rfcMessageId: string;
      referencesHeader: string;
    }>("/api/gmail/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        subject,
        body,
        correlationId: invoice.correlationId,
        threadId: latestThreadEvent?.threadId || null,
        replyToRfcMessageId: latestThreadEvent?.rfcMessageId || null,
        referencesHeader: latestThreadEvent?.referencesHeader || null,
      }),
    });

    if (!result.ok) {
      throw new Error(result.error || "Failed to send PO request email");
    }

    const now = new Date().toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-");
    setInvoice((prev) => ({
      ...prev,
      selectedMerchantEmail: to,
      emailStates: mergeEmailStates(prev.emailStates, ["Email Sent"], ["Draft"]),
      currentWorkflowStep: Math.max(prev.currentWorkflowStep, 3),
      lastEmailSent: now,
      nextReminderIn: "23h 59m",
    }));
    setTimeline((prev) => [
      {
        id: `evt-send-${Date.now()}`,
        type: "sent",
        timestamp: now,
        description: `PO request email sent to ${to}${result.data?.threadId ? ` (thread ${result.data.threadId})` : ""}`,
        to,
        subject,
        body,
        threadId: result.data?.threadId || latestThreadEvent?.threadId,
        rfcMessageId: result.data?.rfcMessageId || "",
        referencesHeader: result.data?.referencesHeader || "",
        attachments: [],
      },
      ...prev,
    ]);
    toast.success("PO request email sent");
  };

  const sendReminderNow = () => {
    const now = new Date().toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-");
    setInvoice((prev) => ({
      ...prev,
      remindersSent: Math.min(prev.reminderLimit, prev.remindersSent + 1),
      nextReminderIn: "47h 59m",
      lastEmailSent: now,
      emailStates: mergeEmailStates(prev.emailStates, ["Reminder Scheduled"], ["Draft"]),
    }));
    setTimeline((prev) => [
      {
        id: `evt-reminder-${Date.now()}`,
        type: "reminder",
        timestamp: now,
        description: "Manual reminder email sent to supplier",
      },
      ...prev,
    ]);
    toast.success("Reminder sent");
  };

  const configureReminders = () => {
    toast.info("Reminder settings coming next");
  };

  const syncPoReference = (poNumber: string, sourceLabel: string) => {
    const nextPo = poNumber.trim();
    if (!nextPo) {
      toast.error("Please enter a PO number");
      return;
    }
    const now = new Date().toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-");
    setInvoice((prev) => ({
      ...prev,
      reference: buildReference(prev.reference, nextPo),
      status: "PO Received",
      currentWorkflowStep: Math.max(prev.currentWorkflowStep, 7),
      lastSyncTime: now,
      lastSyncDirection: "System -> Xero",
    }));
    setManualPoNumber(nextPo);
    setTimeline((prev) => [
      {
        id: `evt-ref-${Date.now()}`,
        type: "updated",
        timestamp: now,
        description: `${nextPo} synced to invoice reference from ${sourceLabel}`,
      },
      ...prev,
    ]);
    toast.success("Invoice reference updated");
  };

  const confirmPo = (id: string) => {
    const po = detections.find((item) => item.id === id);
    if (!po) return;
    setDetections((prev) => prev.map((item) => (item.id === id ? { ...item, status: "confirmed" } : item)));
    setSelectedDetectionId(id);
    setInvoice((prev) => ({
      ...prev,
      emailStates: mergeEmailStates(prev.emailStates, ["Get Reply", "Get PO"], ["Draft"]),
    }));
    syncPoReference(po.poNumber, "PO Detection");
  };

  const rejectPo = (id: string) => {
    const po = detections.find((item) => item.id === id);
    if (!po) return;
    setDetections((prev) => prev.map((item) => (item.id === id ? { ...item, status: "rejected" } : item)));
    if (selectedDetectionId === id) {
      setSelectedDetectionId(null);
    }
    toast.info(`${po.poNumber} rejected`);
  };

  const syncManualPoToInvoiceReference = () => {
    syncPoReference(manualPoNumber, "manual input");
  };

  useEffect(() => {
    setInvoice((prev) => ({
      ...prev,
      correlationId: resolvedCorrelationId,
      selectedMerchantEmail: "",
      merchantEmails: [],
      merchantEmailRecipients: [],
      emailStates: ["Draft"],
      lastReplyReceived: "No reply yet",
      lastEmailSent: "",
      nextReminderIn: "NaNh NaNm",
    }));
    setTimeline([]);
    setDetections(initialPoDetections);
    setSelectedDetectionId(null);
    setManualPoNumber("");
  }, [resolvedCorrelationId]);

  useEffect(() => {
    let cancelled = false;

    const refreshThreadEvents = async () => {
      if (!invoice.selectedMerchantEmail || !invoice.correlationId) {
        setTimeline((prev) => prev.filter((event) => !["sent", "reminder", "reply"].includes(event.type)));
        return;
      }

      const res = await requestJson<{
        events: EmailTimelineEvent[];
        unreadReplyCount: number;
        hasReply: boolean;
        hasPo: boolean;
        detectedPoNumber: string;
        lastReplyTimestamp: string;
      }>(
        `/api/gmail/thread?counterpartyEmail=${encodeURIComponent(invoice.selectedMerchantEmail)}&correlationId=${encodeURIComponent(invoice.correlationId)}`
      );

      if (!res.ok || !res.data || !Array.isArray(res.data.events) || cancelled) {
        setTimeline((prev) => prev.filter((event) => !["sent", "reminder", "reply"].includes(event.type)));
        return;
      }
      const threadData = res.data;

      setTimeline((prev) => {
        const nonThreadEvents = prev.filter((event) => !["sent", "reminder", "reply"].includes(event.type));
        return [...threadData.events, ...nonThreadEvents];
      });

      setInvoice((prev) => ({
        ...prev,
        emailStates:
          threadData.events.length === 0
            ? ["Draft"]
            : EMAIL_STATE_ORDER.filter((state) =>
                [
                  "Email Sent",
                  ...(threadData.events.some((event) => event.type === "reminder") ? (["Reminder Scheduled"] as const) : []),
                  ...(threadData.hasReply ? (["Get Reply"] as const) : []),
                  ...(threadData.hasPo ? (["Get PO"] as const) : []),
                ].includes(state)
              ),
        lastReplyReceived: threadData.lastReplyTimestamp || prev.lastReplyReceived,
      }));

      if (threadData.detectedPoNumber) {
        setManualPoNumber(threadData.detectedPoNumber);
      }
    };

    void refreshThreadEvents();
    const timer = window.setInterval(() => {
      void refreshThreadEvents();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [invoice.selectedMerchantEmail, invoice.correlationId]);

  const unreadReplyCount = timeline.filter((event) => event.type === "reply" && event.unread).length;

  const markPoThreadSeen = async () => {
    if (!invoice.selectedMerchantEmail || !invoice.correlationId) return;

    const res = await requestJson<{ updated: number }>("/api/gmail/thread/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        counterpartyEmail: invoice.selectedMerchantEmail,
        correlationId: invoice.correlationId,
      }),
    });

    if (!res.ok) return;

    setTimeline((prev) =>
      prev.map((event) => (event.type === "reply" ? { ...event, unread: false } : event))
    );
  };

  useEffect(() => {
    let cancelled = false;

    const loadMerchantRecipients = async () => {
      if (customer?.type?.toLowerCase() !== "business" || !customer.name.trim()) {
        setInvoice((prev) => ({
          ...prev,
          contact: customer?.name?.trim() || prev.contact,
          merchantUserName: "team",
          merchantEmails: [],
          merchantEmailRecipients: [],
          selectedMerchantEmail: "",
          vehicleRego: vehicle?.plate || prev.vehicleRego,
          vehicleModel: vehicle?.model || prev.vehicleModel,
          vehicleMake: vehicle?.make || prev.vehicleMake,
        }));
        return;
      }

      const res = await requestJson<Array<{
        id: string;
        type: string;
        name: string;
        email: string;
        businessCode: string;
        staffMembers?: Array<{ name: string; title: string; email: string }>;
      }>>("/api/customers");

      if (!res.ok || !Array.isArray(res.data) || cancelled) {
        setInvoice((prev) => ({
          ...prev,
          contact: customer.name.trim(),
          merchantUserName: "team",
          merchantEmails: customer.email?.trim() ? [customer.email.trim()] : [],
          merchantEmailRecipients: customer.email?.trim()
            ? [{ email: customer.email.trim(), kind: "business", name: "Team", title: "" }]
            : [],
          selectedMerchantEmail: customer.email?.trim() || "",
          vehicleRego: vehicle?.plate || prev.vehicleRego,
          vehicleModel: vehicle?.model || prev.vehicleModel,
          vehicleMake: vehicle?.make || prev.vehicleMake,
        }));
        return;
      }

      const normalizedBusinessCode = (customer.businessCode ?? "").trim().toLowerCase();
      const normalizedName = customer.name.trim().toLowerCase();
      const matched = res.data.find((row) => {
        if ((row.type ?? "").toLowerCase() !== "business") return false;
        const rowBusinessCode = (row.businessCode ?? "").trim().toLowerCase();
        const rowName = (row.name ?? "").trim().toLowerCase();
        return (normalizedBusinessCode && rowBusinessCode === normalizedBusinessCode) || rowName === normalizedName;
      });

      const recipients: MerchantEmailRecipient[] = [];
      const seen = new Set<string>();
      const pushRecipient = (recipient: MerchantEmailRecipient | null) => {
        if (!recipient) return;
        const key = recipient.email.trim().toLowerCase();
        if (!key || seen.has(key)) return;
        seen.add(key);
        recipients.push(recipient);
      };

      pushRecipient(
        matched?.email?.trim()
          ? { email: matched.email.trim(), kind: "business", name: "Team", title: "" }
          : customer.email?.trim()
            ? { email: customer.email.trim(), kind: "business", name: "Team", title: "" }
            : null
      );

      for (const staff of matched?.staffMembers ?? []) {
        if (!staff?.email?.trim()) continue;
        pushRecipient({
          email: staff.email.trim(),
          kind: "staff",
          name: staff.name?.trim() || "staff",
          title: staff.title?.trim() || "",
        });
      }

      if (cancelled) return;

      setInvoice((prev) => ({
        ...prev,
        contact: matched?.name?.trim() || customer.name.trim(),
        merchantUserName:
          recipients.find((item) => item.kind === "staff")?.name ||
          (recipients[0]?.kind === "business" ? "team" : prev.merchantUserName),
        merchantEmails: recipients.map((item) => item.email),
        merchantEmailRecipients: recipients,
        selectedMerchantEmail:
          recipients.some((item) => item.email === prev.selectedMerchantEmail)
            ? prev.selectedMerchantEmail
            : (recipients[0]?.email ?? ""),
        vehicleRego: vehicle?.plate || prev.vehicleRego,
        vehicleModel: vehicle?.model || prev.vehicleModel,
        vehicleMake: vehicle?.make || prev.vehicleMake,
      }));
    };

    void loadMerchantRecipients();
    return () => {
      cancelled = true;
    };
  }, [customer, vehicle]);

  return {
    invoice,
    items,
    itemCatalog,
    timeline,
    detections,
    selectedDetectionId,
    itemCatalogSyncState,
    itemCatalogFeedback,
    itemCatalogLastUpdated,
    itemsDirty,
    pendingFocusRowId,
    unreadReplyCount,
    subtotal,
    taxTotal,
    totalAmount,
    manualPoNumber,
    setSelectedDetectionId,
    setPendingFocusRowId,
    setManualPoNumber,
    updateItem,
    addItem,
    deleteItem,
    syncInvoice,
    openInXero,
    refreshItemCatalog,
    sendPoRequest,
    sendReminderNow,
    configureReminders,
    confirmPo,
    rejectPo,
    syncManualPoToInvoiceReference,
    markPoThreadSeen,
  };
}

export type InvoiceDashboardModel = ReturnType<typeof useInvoiceDashboardState>;
