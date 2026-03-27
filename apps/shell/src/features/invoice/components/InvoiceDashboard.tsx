import { useInvoiceDashboardState, type InvoiceDashboardModel } from "../hooks/useInvoiceDashboardState";
import { InvoiceItemsTable } from "./InvoiceItemsTable";
import { InvoiceSummaryCard } from "./InvoiceSummaryCard";

type InvoiceDashboardProps = {
  model?: InvoiceDashboardModel;
  hasInvoice?: boolean;
  onCreateInvoice?: () => Promise<{ success: boolean; message?: string }>;
  isCreatingInvoice?: boolean;
  needsPo?: boolean;
};

export function InvoiceDashboard({ model, hasInvoice, onCreateInvoice, isCreatingInvoice }: InvoiceDashboardProps) {
  const dashboard = model ?? useInvoiceDashboardState();
  return (
    <InvoiceDashboardContent
      model={dashboard}
      hasInvoice={hasInvoice}
      onCreateInvoice={onCreateInvoice}
      isCreatingInvoice={isCreatingInvoice}
    />
  );
}

export function InvoiceDashboardContent({
  model,
  hasInvoice,
  onCreateInvoice,
  isCreatingInvoice,
}: {
  model: InvoiceDashboardModel;
  hasInvoice?: boolean;
  onCreateInvoice?: () => Promise<{ success: boolean; message?: string }>;
  isCreatingInvoice?: boolean;
}) {
  const isReadOnly = model.invoice.xeroStatus === "AUTHORISED" || model.invoice.xeroStatus === "PAID";

  return (
    <div className="space-y-6">
      <InvoiceSummaryCard
        invoice={model.invoice}
        subtotal={model.subtotal}
        taxTotal={model.taxTotal}
        totalAmount={model.totalAmount}
        canSync={!isReadOnly && model.itemsDirty}
        canDiscardChanges={!isReadOnly && model.itemsDirty}
        onSync={model.syncInvoice}
        onDiscardChanges={() => void model.discardChanges()}
        onRefreshFromXero={model.refreshFromXero}
        onOpenXero={model.openInXero}
        onSaveReference={model.saveReference}
        onInvoiceNoteChange={model.setInvoiceNote}
        onUpdateXeroState={model.updateXeroState}
        isRefreshingFromXero={model.refreshingFromXero}
        isUpdatingXeroState={model.updatingXeroState}
        referencePreview={model.referencePreview}
        hasInvoice={hasInvoice}
        onCreateInvoice={onCreateInvoice}
        isCreatingInvoice={isCreatingInvoice}
      >
        <InvoiceItemsTable
          items={model.items}
          readOnly={isReadOnly}
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
  );
}
