import { PoDashboard } from "@/features/invoice/components/PoDashboard";
import type { InvoiceDashboardModel } from "@/features/invoice/hooks/useInvoiceDashboardState";

type PoPanelProps = {
  model: InvoiceDashboardModel;
};

export function PoPanel({ model }: PoPanelProps) {
  return (
    <div className="py-6">
      <PoDashboard model={model} />
    </div>
  );
}
