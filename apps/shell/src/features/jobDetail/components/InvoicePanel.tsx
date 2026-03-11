import { InvoiceDashboard } from "@/features/invoice/components/InvoiceDashboard";
import type { InvoiceDashboardModel } from "@/features/invoice/hooks/useInvoiceDashboardState";

type InvoicePanelProps = {
  model?: InvoiceDashboardModel;
};

export function InvoicePanel({ model }: InvoicePanelProps) {
  return (
    <div className="py-6">
      <InvoiceDashboard model={model} />
    </div>
  );
}
