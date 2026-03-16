import { InvoiceDashboard } from "@/features/invoice/components/InvoiceDashboard";
import type { InvoiceDashboardModel } from "@/features/invoice/hooks/useInvoiceDashboardState";

type InvoicePanelProps = {
  model?: InvoiceDashboardModel;
  hasInvoice?: boolean;
  onCreateInvoice?: () => Promise<{ success: boolean; message?: string }>;
  isCreatingInvoice?: boolean;
  needsPo?: boolean;
};

export function InvoicePanel({ model, hasInvoice, onCreateInvoice, isCreatingInvoice, needsPo }: InvoicePanelProps) {
  return (
    <div className="py-6">
      <InvoiceDashboard
        model={model}
        hasInvoice={hasInvoice}
        onCreateInvoice={onCreateInvoice}
        isCreatingInvoice={isCreatingInvoice}
        needsPo={needsPo}
      />
    </div>
  );
}
