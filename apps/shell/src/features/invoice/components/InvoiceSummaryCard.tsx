import { Check, ChevronDown, Pencil, Plus, RefreshCcw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, Input } from "@/components/ui";
import { XeroButton } from "@/components/common/XeroButton";
import { withApiBase } from "@/utils/api";
import type { InvoiceDashboardState, ReferencePreviewSource, XeroStateOption } from "../types";
import type React from "react";

type Props = {
  invoice: InvoiceDashboardState;
  subtotal: number;
  taxTotal: number;
  totalAmount: number;
  canSync: boolean;
  canDiscardChanges?: boolean;
  onSync: () => void;
  onDiscardChanges?: () => void;
  onRefreshFromXero?: () => void;
  onOpenXero: () => void;
  onSaveReference?: (value: string) => Promise<boolean>;
  onUpdateXeroState?: (state: XeroStateOption, epostReferenceId?: string) => Promise<boolean>;
  isRefreshingFromXero?: boolean;
  isUpdatingXeroState?: boolean;
  referencePreview?: ReferencePreviewSource | null;
  hasInvoice?: boolean;
  onCreateInvoice?: () => Promise<{ success: boolean; message?: string }>;
  isCreatingInvoice?: boolean;
  children?: React.ReactNode;
};

const XERO_STATE_STYLES: Record<"DRAFT" | "AUTHORISED" | "PAID", string> = {
  DRAFT: "border-[#b7c0c8] bg-[#e2e6ea] text-[#4b5563]",
  AUTHORISED: "border-[#8fd3a7] bg-[#bfe8cc] text-[#1f5132]",
  PAID: "border-[#88c4e8] bg-[#c9e8fb] text-[#17506f]",
};

function SummaryField({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <div className="text-sm text-[var(--ds-muted)]">{label}</div>
      <div className={["mt-1 text-base font-semibold text-[var(--ds-text)]", className].join(" ")}>{value}</div>
    </div>
  );
}

export function InvoiceSummaryCard({
  invoice,
  canSync,
  canDiscardChanges = false,
  onSync,
  onDiscardChanges,
  onRefreshFromXero,
  onOpenXero,
  onSaveReference,
  onUpdateXeroState,
  isRefreshingFromXero = false,
  isUpdatingXeroState = false,
  referencePreview = null,
  hasInvoice = true,
  onCreateInvoice,
  isCreatingInvoice = false,
  children,
}: Props) {
  const isReadOnly = invoice.xeroStatus === "PAID";
  const [isEditingReference, setIsEditingReference] = useState(false);
  const [referenceDraft, setReferenceDraft] = useState(invoice.reference);
  const [savingReference, setSavingReference] = useState(false);
  const [showReferencePreview, setShowReferencePreview] = useState(false);
  const [xeroState, setXeroState] = useState<XeroStateOption>("DRAFT");
  const [savedXeroState, setSavedXeroState] = useState<XeroStateOption>("DRAFT");

  useEffect(() => {
    const paymentMethod = invoice.latestPaymentMethod?.trim().toLowerCase();
    const nextState: XeroStateOption =
      paymentMethod === "cash"
        ? "PAID_CASH"
        : paymentMethod === "epost"
          ? "PAID_EPOST"
          : paymentMethod === "bank_transfer"
            ? "PAID_BANK_TRANSFER"
            : invoice.xeroStatus === "AUTHORISED"
              ? "AUTHORISED"
              : "DRAFT";
    setXeroState(nextState);
    setSavedXeroState(nextState);
  }, [invoice.xeroStatus, invoice.latestPaymentMethod]);

  useEffect(() => {
    setReferenceDraft(invoice.reference);
  }, [invoice.reference]);

  const previewUrl = useMemo(() => {
    if (!referencePreview || referencePreview.previewType === "text") return null;
    if (!referencePreview.gmailMessageId || !referencePreview.attachmentId || !referencePreview.attachmentFileName || !referencePreview.attachmentMimeType) {
      return null;
    }

    return withApiBase(
      `/api/gmail/attachment?${new URLSearchParams({
        messageId: referencePreview.gmailMessageId,
        attachmentId: referencePreview.attachmentId,
        fileName: referencePreview.attachmentFileName,
        mimeType: referencePreview.attachmentMimeType,
        inline: "true",
      }).toString()}`
    );
  }, [referencePreview]);

  const handleSaveReference = async () => {
    if (!onSaveReference) return;
    setSavingReference(true);
    try {
      const ok = await onSaveReference(referenceDraft);
      if (ok) setIsEditingReference(false);
    } finally {
      setSavingReference(false);
    }
  };

  const handleApplyXeroState = async () => {
    if (!onUpdateXeroState) return;
    const ok = await onUpdateXeroState(xeroState);
    if (ok) {
      setSavedXeroState(xeroState);
    }
  };

  const handleCancelXeroStateChange = () => {
    setXeroState(savedXeroState);
  };

  const xeroStateDirty = xeroState !== savedXeroState;
  const currentXeroStateStyle =
    xeroState === "AUTHORISED"
      ? XERO_STATE_STYLES.AUTHORISED
      : xeroState === "DRAFT"
        ? XERO_STATE_STYLES.DRAFT
        : XERO_STATE_STYLES.PAID;

  return (
    <Card className="rounded-[18px] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--ds-border)] pb-5">
        <div>
          <div className="text-2xl font-semibold text-[var(--ds-text)]">Invoice Summary</div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--ds-muted)]">
            <span>Xero ID: {invoice.xeroInvoiceId}</span>
            <div className="inline-flex items-center gap-2 whitespace-nowrap">
              <div className="relative">
                <select
                  value={xeroState}
                  onChange={(event) => setXeroState(event.target.value as XeroStateOption)}
                  disabled={isReadOnly}
                  className={[
                    "h-8 appearance-none rounded-[6px] border px-3 pr-8 text-sm font-normal leading-5 shadow-none outline-none transition-colors",
                    "focus:ring-2 focus:ring-[rgba(37,99,235,0.12)]",
                    currentXeroStateStyle,
                    isReadOnly ? "cursor-default" : "cursor-pointer",
                  ].join(" ")}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="AUTHORISED">Waiting Payment</option>
                  <option value="PAID_CASH">Cash Payment</option>
                  <option value="PAID_EPOST">ePost Payment</option>
                  <option value="PAID_BANK_TRANSFER">Bank Transfer</option>
                </select>
                {!isReadOnly ? (
                  <ChevronDown
                    className={[
                      "pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2",
                      xeroState === "AUTHORISED" ? "text-[#1f5132]" : xeroState === "DRAFT" ? "text-[#4b5563]" : "text-[#17506f]",
                    ].join(" ")}
                  />
                ) : null}
              </div>
              {xeroStateDirty ? (
                <>
                  <Button className="h-8 px-3 text-xs" variant="ghost" onClick={handleCancelXeroStateChange} disabled={isReadOnly || isUpdatingXeroState}>
                    Cancel
                  </Button>
                  <Button className="h-8 px-3 text-xs" variant="primary" onClick={() => void handleApplyXeroState()} disabled={isReadOnly || !onUpdateXeroState || isUpdatingXeroState}>
                    {isUpdatingXeroState ? "Saving..." : "Apply"}
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </div>
        {hasInvoice ? (
          <div className="flex flex-wrap gap-3">
            <Button
              variant="ghost"
              leftIcon={<RefreshCcw className={["h-4 w-4", isRefreshingFromXero ? "animate-spin" : ""].join(" ")} />}
              className="h-11 px-5"
              onClick={onRefreshFromXero}
              disabled={isReadOnly || !onRefreshFromXero || isRefreshingFromXero}
            >
              {isRefreshingFromXero ? "Pulling..." : "Pull From Xero"}
            </Button>
            <XeroButton className="h-11 px-5" onClick={onOpenXero} />
          </div>
        ) : (
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            className="h-11 px-5"
            onClick={() => void onCreateInvoice?.()}
            disabled={!onCreateInvoice || isCreatingInvoice}
          >
            {isCreatingInvoice ? "Creating..." : "New Invoice"}
          </Button>
        )}
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-3 xl:grid-cols-4">
        <SummaryField label="Contact" value={invoice.contact} />
        <SummaryField label="Issue date" value={invoice.issueDate} />
        <SummaryField label="Invoice number" value={invoice.invoiceNumber} />
        <div>
          <div className="text-sm text-[var(--ds-muted)]">Reference</div>
          {isEditingReference ? (
            <div className="mt-1 flex items-center gap-2">
              <Input value={referenceDraft} onChange={(event) => setReferenceDraft(event.target.value)} className="h-9" />
              <Button variant="ghost" className="h-9 px-3" onClick={() => void handleSaveReference()} disabled={savingReference}>
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                className="h-9 px-3"
                onClick={() => {
                  setReferenceDraft(invoice.reference);
                  setIsEditingReference(false);
                }}
                disabled={savingReference}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <div className="text-base font-semibold text-[var(--ds-text)]">{invoice.reference}</div>
              {hasInvoice ? (
                <button
                  type="button"
                  className="rounded-full p-1 text-[var(--ds-muted)] hover:bg-[rgba(0,0,0,0.04)] hover:text-[var(--ds-text)]"
                  onClick={() => setIsEditingReference(true)}
                  disabled={isReadOnly}
                >
                  <Pencil className="h-4 w-4" />
                </button>
              ) : null}
              {referencePreview ? (
                <button
                  type="button"
                  className="text-sm font-medium text-sky-700 hover:text-sky-900"
                  onClick={() => setShowReferencePreview(true)}
                >
                  View Source
                </button>
              ) : null}
            </div>
          )}
        </div>
        <SummaryField label="Last Sync Time" value={invoice.lastSyncTime} />
        <SummaryField label="Sync Direction" value={invoice.lastSyncDirection} className="text-[var(--ds-primary)]" />
      </div>

      {hasInvoice ? (
        children
      ) : (
        <div className="mt-6 rounded-[14px] border border-dashed border-[var(--ds-border)] px-5 py-8 text-sm text-[var(--ds-muted)]">
          This job does not have a linked Xero draft invoice yet. Create one to load the saved draft from the database.
        </div>
      )}

      {hasInvoice ? (
        <div className="mt-6 flex justify-end gap-3 border-t border-[var(--ds-border)] pt-5">
          {!isReadOnly && canDiscardChanges ? (
            <Button
              variant="ghost"
              leftIcon={<X className="h-4 w-4" />}
              className="h-11 border-[var(--ds-border)] px-5"
              onClick={onDiscardChanges}
            >
              Cancel Changes
            </Button>
          ) : null}
          {!isReadOnly ? (
            <Button
              variant={canSync ? "primary" : "ghost"}
              leftIcon={<RefreshCcw className="h-4 w-4" />}
              className={[
                "h-11 px-5",
                !canSync ? "border-[var(--ds-border)] bg-[rgba(0,0,0,0.04)] text-[var(--ds-muted)] hover:bg-[rgba(0,0,0,0.04)]" : "",
              ].join(" ")}
              onClick={onSync}
              disabled={!canSync}
            >
              Sync with Xero
            </Button>
          ) : null}
        </div>
      ) : null}

      {showReferencePreview && referencePreview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-slate-900">{referencePreview.label || referencePreview.poNumber}</div>
                <div className="text-xs text-slate-500">
                  {referencePreview.previewType === "pdf" ? "PDF Preview" : referencePreview.previewType === "image" ? "Image Preview" : "Reply Body"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReferencePreview(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-[70vh] flex-1 bg-slate-100">
              {referencePreview.previewType === "image" && previewUrl ? (
                <div className="flex h-full items-center justify-center p-4">
                  <img src={previewUrl} alt={referencePreview.label} className="max-h-full max-w-full object-contain" />
                </div>
              ) : referencePreview.previewType === "pdf" && previewUrl ? (
                <iframe title={referencePreview.label} src={previewUrl} className="h-[70vh] w-full border-0" />
              ) : (
                <div className="h-full overflow-auto whitespace-pre-wrap p-6 text-sm text-slate-700">
                  {referencePreview.body || "No reply body available."}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
