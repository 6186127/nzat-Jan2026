import { useMemo, useState } from "react";
import { useToast } from "@/components/ui";
import { EmailTimeline } from "./EmailTimeline";
import { InvoiceItemsTable } from "./InvoiceItemsTable";
import { InvoiceSummaryCard } from "./InvoiceSummaryCard";
import { PoDetectionPanel } from "./PoDetectionPanel";
import { PoRequestPanel } from "./PoRequestPanel";
import { ReminderPanel } from "./ReminderPanel";
import { WorkflowSidebar } from "./WorkflowSidebar";
import {
  initialEmailTimeline,
  initialInvoiceItems,
  initialInvoiceState,
  initialPoDetections,
  invoiceWorkflowSteps,
} from "../mockData";
import type { InvoiceItem } from "../types";

function createNewItem(nextId: number): InvoiceItem {
  return {
    id: `line-${nextId}`,
    description: "New invoice line item",
    quantity: 1,
    unitPrice: 0,
    tax: 0,
  };
}

export function InvoiceDashboard() {
  const toast = useToast();
  const [invoice, setInvoice] = useState(initialInvoiceState);
  const [items, setItems] = useState(initialInvoiceItems);
  const [timeline, setTimeline] = useState(initialEmailTimeline);
  const [detections, setDetections] = useState(initialPoDetections);
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [nextItemId, setNextItemId] = useState(initialInvoiceItems.length + 1);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items]
  );
  const taxTotal = useMemo(() => items.reduce((sum, item) => sum + item.tax, 0), [items]);
  const totalAmount = useMemo(() => subtotal + taxTotal, [subtotal, taxTotal]);

  const updateItem = (id: string, field: keyof InvoiceItem, value: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === "description") return { ...item, description: value };
        const parsed = Number(value || 0);
        return { ...item, [field]: Number.isFinite(parsed) ? parsed : 0 };
      })
    );
  };

  const addItem = () => {
    setItems((prev) => [...prev, createNewItem(nextItemId)]);
    setNextItemId((prev) => prev + 1);
    toast.info("Added a new invoice item row");
  };

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    toast.info("Invoice item removed");
  };

  const syncInvoice = () => {
    const now = new Date().toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-");
    setInvoice((prev) => ({
      ...prev,
      synced: true,
      status: prev.status === "Draft" ? "Awaiting PO" : prev.status,
      lastSyncTime: now,
      currentWorkflowStep: Math.max(prev.currentWorkflowStep, 2),
    }));
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

  const saveItems = () => {
    toast.success("Invoice items saved");
  };

  const sendPoRequest = () => {
    const now = new Date().toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-");
    setInvoice((prev) => ({
      ...prev,
      emailStates: ["Email Sent", "Waiting for Reply", "Reminder Scheduled"],
      currentWorkflowStep: Math.max(prev.currentWorkflowStep, 3),
      lastEmailSent: now,
      nextReminderIn: "23h 59m",
    }));
    setTimeline((prev) => [
      {
        id: `evt-send-${Date.now()}`,
        type: "sent",
        timestamp: now,
        description: `PO request email sent to ${invoice.merchantEmail}`,
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

  const confirmPo = (id: string) => {
    const po = detections.find((item) => item.id === id);
    if (!po) return;
    setDetections((prev) => prev.map((item) => (item.id === id ? { ...item, status: "confirmed" } : item)));
    setInvoice((prev) => ({
      ...prev,
      status: "PO Received",
      currentWorkflowStep: Math.max(prev.currentWorkflowStep, 6),
    }));
    setTimeline((prev) => [
      {
        id: `evt-confirm-${Date.now()}`,
        type: "confirmed",
        timestamp: new Date().toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-"),
        description: `${po.poNumber} confirmed and invoice reference ready for Xero`,
      },
      ...prev,
    ]);
    toast.success(`${po.poNumber} confirmed`);
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

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-3">
        <WorkflowSidebar steps={invoiceWorkflowSteps} currentStep={invoice.currentWorkflowStep} />
      </div>

      <div className="space-y-6 lg:col-span-9">
        <InvoiceSummaryCard invoice={invoice} totalAmount={totalAmount} onSync={syncInvoice} onOpenXero={openInXero} />
        <InvoiceItemsTable
          items={items}
          synced={invoice.synced}
          subtotal={subtotal}
          taxTotal={taxTotal}
          totalAmount={totalAmount}
          onAddItem={addItem}
          onChangeItem={updateItem}
          onDeleteItem={deleteItem}
          onSave={saveItems}
          onSync={syncInvoice}
        />
        <PoRequestPanel
          merchantEmail={invoice.merchantEmail}
          correlationId={invoice.correlationId}
          snapshotTotal={invoice.snapshotTotal}
          emailStates={invoice.emailStates}
          previewOpen={previewOpen}
          onTogglePreview={() => setPreviewOpen((prev) => !prev)}
          onSendRequest={sendPoRequest}
        />
        <ReminderPanel
          lastEmailSent={invoice.lastEmailSent}
          lastReplyReceived={invoice.lastReplyReceived}
          remindersSent={invoice.remindersSent}
          reminderLimit={invoice.reminderLimit}
          nextReminderIn={invoice.nextReminderIn}
          onConfigure={() => toast.info("Reminder settings coming next")}
          onSendNow={sendReminderNow}
        />
        <EmailTimeline events={timeline} />
        <PoDetectionPanel
          detections={detections}
          selectedDetectionId={selectedDetectionId}
          onSelect={setSelectedDetectionId}
          onConfirm={confirmPo}
          onReject={rejectPo}
        />
      </div>
    </div>
  );
}
