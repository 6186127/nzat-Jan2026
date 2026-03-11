import { useEffect, useMemo, useState } from "react";
import { MailCheck, Send, Settings2, X } from "lucide-react";
import { Button, Card, Input, Select, Textarea } from "@/components/ui";
import { StatusBadge } from "./StatusBadge";
import type { EmailState, InvoiceItem } from "../types";

type Props = {
  merchantUserName: string;
  merchantEmails: string[];
  selectedMerchantEmail: string;
  correlationId: string;
  vehicleRego: string;
  vehicleModel: string;
  vehicleMake: string;
  snapshotTotal: number;
  items: InvoiceItem[];
  emailStates: EmailState[];
  onSendRequest: (payload: { to: string; subject: string; body: string }) => void;
};

export function PoRequestPanel({
  merchantUserName,
  merchantEmails,
  selectedMerchantEmail,
  correlationId,
  vehicleRego,
  vehicleModel,
  vehicleMake,
  snapshotTotal,
  items,
  emailStates,
  onSendRequest,
}: Props) {
  const vehicleLabel = useMemo(
    () => `${[vehicleRego, vehicleModel, vehicleMake].filter(Boolean).join(" ")} from NZAT`,
    [vehicleMake, vehicleModel, vehicleRego]
  );

  const defaultSubject = useMemo(
    () => `PO Request for ${vehicleLabel} [${correlationId}]`,
    [correlationId, vehicleLabel]
  );

  const invoiceItemsText = useMemo(
    () =>
      items
        .map(
          (item, index) =>
            `${index + 1}. ${item.itemCode || "-"} | ${item.description} | Qty: ${item.quantity} | $${item.unitPrice.toFixed(2)} `
        )
        .join("\n"),
    [items]
  );

  const defaultBody = useMemo(
    () =>
      `Hi ${merchantUserName},\n\nPlease find the server items below:\n${invoiceItemsText}\n\n Total: $${snapshotTotal.toFixed(2)}.`,
    [invoiceItemsText, merchantUserName, snapshotTotal]
  );

  const [to, setTo] = useState(selectedMerchantEmail);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [lastSentPayload, setLastSentPayload] = useState<{ to: string; subject: string; body: string } | null>(null);

  useEffect(() => {
    setTo(selectedMerchantEmail);
  }, [selectedMerchantEmail]);

  useEffect(() => {
    setSubject(defaultSubject);
  }, [defaultSubject]);

  useEffect(() => {
    setBody(defaultBody);
  }, [defaultBody]);

  const isModified = to !== selectedMerchantEmail || subject !== defaultSubject || body !== defaultBody;
  const isCurrentPayloadSent =
    lastSentPayload?.to === to && lastSentPayload?.subject === subject && lastSentPayload?.body === body;

  const sendDisabled = Boolean(isCurrentPayloadSent && !isModified);

  const handleSend = () => {
    const payload = { to, subject, body };
    onSendRequest(payload);
    setLastSentPayload(payload);
  };

  const handleCancel = () => {
    setTo(selectedMerchantEmail);
    setSubject(defaultSubject);
    setBody(defaultBody);
  };

  return (
    <Card className="rounded-[18px] p-6">
      <div className="text-[28px] font-semibold tracking-[-0.03em] text-slate-900">Request Purchase Order</div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div>
          <div className="mb-2 text-sm font-medium text-slate-700">Merchant Email</div>
          <Select value={to} onChange={(event) => setTo(event.target.value)}>
            {merchantEmails.map((email) => (
              <option key={email} value={email}>
                {email}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <div className="mb-2 text-sm font-medium text-slate-700">Correlation ID</div>
          <Input value={correlationId} readOnly />
        </div>
        <div>
          <div className="mb-2 text-sm font-medium text-slate-700">Invoice Snapshot Total</div>
          <Input value={`$${snapshotTotal.toFixed(2)}`} readOnly />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {emailStates.map((state) => (
          <div key={state} className="flex items-center gap-2">
            <MailCheck className="h-4 w-4 text-slate-500" />
            <StatusBadge kind="state" value={state} />
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Settings2 className="h-4 w-4" />
          Email Preview
        </div>

        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <div>
            <span className="font-semibold text-slate-900">To:</span> {to}
          </div>
          <div>
            <div className="mb-1 font-semibold text-slate-900">Subject</div>
            <Input value={subject} onChange={(event) => setSubject(event.target.value)} />
          </div>
          <div>
            <div className="mb-1 font-semibold text-slate-900">Body</div>
            <Textarea rows={12} value={body} onChange={(event) => setBody(event.target.value)} />
          </div>
          <div className="flex items-center justify-end gap-2">
            {isModified ? (
              <Button className="h-10 px-4" leftIcon={<X className="h-4 w-4" />} onClick={handleCancel}>
                Cancel
              </Button>
            ) : null}
            <Button
              variant={sendDisabled ? "ghost" : "primary"}
              className={[
                "h-10 px-4",
                sendDisabled ? "border-slate-200 bg-slate-200 text-slate-500 hover:bg-slate-200" : "",
              ].join(" ")}
              leftIcon={<Send className="h-4 w-4" />}
              onClick={handleSend}
              disabled={sendDisabled}
            >
              {sendDisabled ? "PO Request Sent" : "Send PO Request"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
