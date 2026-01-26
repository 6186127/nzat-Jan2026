import { Button, EmptyState, SectionCard } from "@/components/ui";

type WofPanelProps = {
  hasRecord: boolean;
  onAdd: () => void;
};

export function WofPanel({ hasRecord, onAdd }: WofPanelProps) {
  if (!hasRecord) {
    return <EmptyState message="没有任何数据" actionLabel="添加" onAction={onAdd} />;
  }

  return (
    <div className="space-y-5 py-4">
      <SectionCard title="WOF Records">
        <div className="mt-3 rounded-[12px] border border-[var(--ds-border)] p-4">
          <button className="text-sm text-[rgba(0,0,0,0.55)] underline">Empty WOF Records</button>
        </div>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="primary">Open NZTA</Button>
          <Button>Refresh</Button>
        </div>
      </SectionCard>

      <SectionCard title="Result">
        <div className="mt-4 space-y-3 text-sm">
          <div>
            <div className="text-xs text-[var(--ds-muted)]">Initiate Result</div>
            <select className="mt-2 h-9 w-full rounded-[8px] border border-[var(--ds-border)] px-3">
              <option>Fail</option>
              <option>Pass</option>
            </select>
          </div>
          <div>
            <div className="text-xs text-[var(--ds-muted)]">Expiry Date</div>
            <input
              type="date"
              className="mt-2 h-9 w-full rounded-[8px] border border-[var(--ds-border)] px-3"
            />
          </div>
          <div>
            <div className="text-xs text-[var(--ds-muted)]">Fail Reason *</div>
            <select className="mt-2 h-9 w-full rounded-[8px] border border-[var(--ds-border)] px-3">
              <option>Fail list...</option>
            </select>
          </div>
          <div>
            <div className="text-xs text-[var(--ds-muted)]">Note</div>
            <textarea
              className="mt-2 h-24 w-full rounded-[8px] border border-[var(--ds-border)] px-3 py-2"
              placeholder=""
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="primary">Save Result</Button>
          <Button>Print</Button>
        </div>
      </SectionCard>
    </div>
  );
}
