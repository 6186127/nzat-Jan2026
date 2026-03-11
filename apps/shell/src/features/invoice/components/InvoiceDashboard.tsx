import { useInvoiceDashboardState, type InvoiceDashboardModel } from "../hooks/useInvoiceDashboardState";
import { InvoiceItemsTable } from "./InvoiceItemsTable";
import { InvoiceSummaryCard } from "./InvoiceSummaryCard";
import { WorkflowSidebar } from "./WorkflowSidebar";
import { invoiceWorkflowSteps } from "../mockData";

type InvoiceDashboardProps = {
  model?: InvoiceDashboardModel;
};

export function InvoiceDashboard({ model }: InvoiceDashboardProps) {
  const dashboard = model ?? useInvoiceDashboardState();
  return <InvoiceDashboardContent model={dashboard} />;
}

export function InvoiceDashboardContent({ model }: { model: InvoiceDashboardModel }) {
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-3">
        <WorkflowSidebar steps={invoiceWorkflowSteps} currentStep={model.invoice.currentWorkflowStep} />
      </div>

      <div className="space-y-6 lg:col-span-9">
        <InvoiceSummaryCard
          invoice={model.invoice}
          subtotal={model.subtotal}
          taxTotal={model.taxTotal}
          totalAmount={model.totalAmount}
          canSync={model.itemsDirty}
          onSync={model.syncInvoice}
          onOpenXero={model.openInXero}
        >
          <InvoiceItemsTable
            items={model.items}
            synced={model.invoice.synced}
            subtotal={model.subtotal}
            taxTotal={model.taxTotal}
            totalAmount={model.totalAmount}
            itemCatalog={model.itemCatalog}
            itemCatalogSyncState={model.itemCatalogSyncState}
            itemCatalogFeedback={model.itemCatalogFeedback}
            itemCatalogLastUpdated={model.itemCatalogLastUpdated}
            pendingFocusRowId={model.pendingFocusRowId}
            onAddItem={model.addItem}
            onChangeItem={model.updateItem}
            onDeleteItem={model.deleteItem}
            onRefreshItemCatalog={model.refreshItemCatalog}
            onPendingFocusHandled={() => model.setPendingFocusRowId(null)}
          />
        </InvoiceSummaryCard>
      </div>
    </div>
  );
}
