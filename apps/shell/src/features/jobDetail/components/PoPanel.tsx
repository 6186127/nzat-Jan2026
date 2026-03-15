import { PoDashboard } from "@/features/invoice/components/PoDashboard";
import type { InvoiceDashboardModel } from "@/features/invoice/hooks/useInvoiceDashboardState";

type PoPanelProps = {
  model: InvoiceDashboardModel;
};

export function PoPanel({ model }: PoPanelProps) {
  if (model.poPanelLoading) {
    return (
      <div className="py-6">
        <div className="rounded-[18px] border border-slate-200 bg-white p-6">
          <div className="space-y-4 animate-pulse">
            <div className="h-8 w-40 rounded bg-slate-200" />
            <div className="h-14 rounded-2xl bg-slate-100" />
            <div className="h-64 rounded-2xl bg-slate-100" />
            <div className="h-44 rounded-2xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      {model.poPanelRefreshing ? (
        <div className="mb-3 flex justify-end">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" />
            Refreshing...
          </div>
        </div>
      ) : null}
      <PoDashboard model={model} />
    </div>
  );
}
