import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import type { InvoiceItem } from "../types";

type Props = {
  items: InvoiceItem[];
  synced: boolean;
  subtotal: number;
  taxTotal: number;
  totalAmount: number;
  onAddItem: () => void;
  onChangeItem: (id: string, field: keyof InvoiceItem, value: string) => void;
  onDeleteItem: (id: string) => void;
  onSave: () => void;
  onSync: () => void;
};

export function InvoiceItemsTable({
  items,
  synced,
  subtotal,
  taxTotal,
  totalAmount,
  onAddItem,
  onChangeItem,
  onDeleteItem,
  onSave,
  onSync,
}: Props) {
  return (
    <Card className="rounded-[18px] p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="text-[28px] font-semibold tracking-[-0.03em] text-slate-900">Invoice Items</div>
        <Button variant="primary" className="h-11 px-5" leftIcon={<Plus className="h-4 w-4" />} onClick={onAddItem}>
          Add Item
        </Button>
      </div>

      {!synced ? (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          <AlertCircle className="h-4 w-4" />
          Invoice not synced with Xero
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-sm font-semibold text-slate-700">
              <th className="px-4 py-4">Description</th>
              <th className="px-4 py-4">Quantity</th>
              <th className="px-4 py-4">Unit Price</th>
              <th className="px-4 py-4">Tax</th>
              <th className="px-4 py-4">Line Total</th>
              <th className="px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const lineTotal = item.quantity * item.unitPrice + item.tax;
              return (
                <tr key={item.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-4 py-3">
                    <Input value={item.description} onChange={(e) => onChangeItem(item.id, "description", e.target.value)} />
                  </td>
                  <td className="px-4 py-3">
                    <Input type="number" step="1" min="0" value={item.quantity} onChange={(e) => onChangeItem(item.id, "quantity", e.target.value)} />
                  </td>
                  <td className="px-4 py-3">
                    <Input type="number" step="0.01" min="0" value={item.unitPrice} onChange={(e) => onChangeItem(item.id, "unitPrice", e.target.value)} />
                  </td>
                  <td className="px-4 py-3">
                    <Input type="number" step="0.01" min="0" value={item.tax} onChange={(e) => onChangeItem(item.id, "tax", e.target.value)} />
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">${lineTotal.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="rounded-lg p-2 text-red-500 hover:bg-red-50" onClick={() => onDeleteItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-[320px] space-y-2 text-right">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Subtotal</span>
            <span className="font-medium text-slate-900">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Tax</span>
            <span className="font-medium text-slate-900">${taxTotal.toFixed(2)}</span>
          </div>
          <div className="border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between text-[18px] font-semibold text-slate-900">
              <span>Total Amount</span>
              <span>${totalAmount.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <Button className="h-11 px-5" onClick={onSave}>
              Save Items
            </Button>
            <Button variant="primary" className="h-11 px-5" onClick={onSync}>
              Sync to Xero
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
