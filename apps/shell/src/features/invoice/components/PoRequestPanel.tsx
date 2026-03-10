import { Eye, MailCheck, Send, Settings2 } from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import { StatusBadge } from "./StatusBadge";
import type { EmailState } from "../types";

type Props = {
  merchantEmail: string;
  correlationId: string;
  snapshotTotal: number;
  emailStates: EmailState[];
  previewOpen: boolean;
  onTogglePreview: () => void;
  onSendRequest: () => void;
};

export function PoRequestPanel({
  merchantEmail,
  correlationId,
  snapshotTotal,
  emailStates,
  previewOpen,
  onTogglePreview,
  onSendRequest,
}: Props) {
  return (
    <Card className="rounded-[18px] p-6">
      <div className="text-[28px] font-semibold tracking-[-0.03em] text-slate-900">Request Purchase Order</div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div>
          <div className="mb-2 text-sm font-medium text-slate-700">Merchant Email</div>
          <Input value={merchantEmail} readOnly />
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

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <Button className="h-11 px-5" leftIcon={<Eye className="h-4 w-4" />} onClick={onTogglePreview}>
          Preview Email
        </Button>
        <Button variant="primary" className="h-11 px-5" leftIcon={<Send className="h-4 w-4" />} onClick={onSendRequest}>
          Send PO Request
        </Button>
      </div>

      {previewOpen ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Settings2 className="h-4 w-4" />
            Email Preview
          </div>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <div><span className="font-semibold text-slate-900">To:</span> {merchantEmail}</div>
            <div><span className="font-semibold text-slate-900">Subject:</span> PO Request for {correlationId}</div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 leading-6">
              Please provide the purchase order reference for invoice {correlationId}. The current invoice snapshot total is ${snapshotTotal.toFixed(2)}.
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
