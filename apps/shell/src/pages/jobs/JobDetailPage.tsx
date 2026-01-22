import { useParams } from "react-router-dom";

export function JobDetailPage() {
  const { id } = useParams();

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--ds-radius)] border border-[var(--ds-border)] bg-[var(--ds-panel)] p-4">
        <div className="text-xs text-[var(--ds-muted)]">Job</div>
        <div className="text-lg font-semibold">{id}</div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-[var(--ds-radius)] border border-[var(--ds-border)] p-3">
            <div className="text-xs text-[var(--ds-muted)]">Vehicle</div>
            <div className="font-medium">PEB264</div>
          </div>
          <div className="rounded-[var(--ds-radius)] border border-[var(--ds-border)] p-3">
            <div className="text-xs text-[var(--ds-muted)]">Customer</div>
            <div className="text-[var(--ds-muted)]">John Smith</div>
          </div>
        </div>
      </div>

      <div className="rounded-[var(--ds-radius)] border border-[var(--ds-border)] bg-[var(--ds-panel)] p-4">
        <div className="text-sm font-semibold">Tabs (next step)</div>
        <div className="mt-2 text-sm text-[var(--ds-muted)]">
          WOF / Mechanical / Paint / Log / Invoice
        </div>
      </div>
    </div>
  );
}

