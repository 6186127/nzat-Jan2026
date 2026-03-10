import { ExternalLink, RefreshCcw } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { StatusBadge } from "./StatusBadge";
import type { InvoiceDashboardState } from "../types";

type Props = {
  invoice: InvoiceDashboardState;
  totalAmount: number;
  onSync: () => void;
  onOpenXero: () => void;
};

export function InvoiceSummaryCard({ invoice, totalAmount, onSync, onOpenXero }: Props) {
  return (
    <Card className="rounded-[18px] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[28px] font-semibold tracking-[-0.03em] text-slate-900">Invoice Summary</div>
        </div>
        <div className="flex items-center gap-3">
          <Button leftIcon={<RefreshCcw className="h-4 w-4" />} className="h-11 px-5" onClick={onSync}>
            Sync with Xero
          </Button>
          <Button variant="primary" leftIcon={<ExternalLink className="h-4 w-4" />} className="h-11 px-5" onClick={onOpenXero}>
            Open in Xero
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-4">
        <div>
          <div className="text-sm text-slate-500">Xero Invoice ID</div>
          <div className="mt-1 text-[34px] font-semibold tracking-[-0.04em] text-slate-900">{invoice.xeroInvoiceId}</div>
        </div>
        <div>
          <div className="text-sm text-slate-500">Status</div>
          <div className="mt-3">
            <StatusBadge kind="invoice" value={invoice.status} />
          </div>
        </div>
        <div>
          <div className="text-sm text-slate-500">Invoice Total</div>
          <div className="mt-1 text-[34px] font-semibold tracking-[-0.04em] text-slate-900">${totalAmount.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-sm text-slate-500">Last Sync Time</div>
          <div className="mt-1 text-[30px] font-semibold tracking-[-0.03em] text-slate-900">{invoice.lastSyncTime}</div>
        </div>
      </div>
    </Card>
  );
}
