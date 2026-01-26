import { Button, EmptyState, SectionCard } from "@/components/ui";
import { JOB_DETAIL_TEXT } from "@/features/jobDetail/jobDetail.constants";

type WofPanelProps = {
  hasRecord: boolean;
  onAdd: () => void;
};

export function WofPanel({ hasRecord, onAdd }: WofPanelProps) {
  if (!hasRecord) {
    return (
      <EmptyState
        message={JOB_DETAIL_TEXT.empty.noData}
        actionLabel={JOB_DETAIL_TEXT.buttons.add}
        onAction={onAdd}
      />
    );
  }

  return (
    <div className="space-y-5 py-4">
      <SectionCard title={JOB_DETAIL_TEXT.labels.wofRecords}>
        <div className="mt-3 rounded-[12px] border border-[var(--ds-border)] p-4">
          <button className="text-sm text-[rgba(0,0,0,0.55)] underline">Empty WOF Records</button>
        </div>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="primary">{JOB_DETAIL_TEXT.buttons.openNzta}</Button>
          <Button>{JOB_DETAIL_TEXT.buttons.refresh}</Button>
        </div>
      </SectionCard>

      <SectionCard title={JOB_DETAIL_TEXT.labels.result}>
        <div className="mt-4 space-y-3 text-sm">
          <div>
            <div className="text-xs text-[var(--ds-muted)]">{JOB_DETAIL_TEXT.labels.initiateResult}</div>
            <select className="mt-2 h-9 w-full rounded-[8px] border border-[var(--ds-border)] px-3">
              <option>Fail</option>
              <option>Pass</option>
            </select>
          </div>
          <div>
            <div className="text-xs text-[var(--ds-muted)]">{JOB_DETAIL_TEXT.labels.expiryDate}</div>
            <input
              type="date"
              className="mt-2 h-9 w-full rounded-[8px] border border-[var(--ds-border)] px-3"
            />
          </div>
          <div>
            <div className="text-xs text-[var(--ds-muted)]">{JOB_DETAIL_TEXT.labels.failReason}</div>
            <select className="mt-2 h-9 w-full rounded-[8px] border border-[var(--ds-border)] px-3">
              <option>Fail list...</option>
            </select>
          </div>
          <div>
            <div className="text-xs text-[var(--ds-muted)]">{JOB_DETAIL_TEXT.labels.note}</div>
            <textarea
              className="mt-2 h-24 w-full rounded-[8px] border border-[var(--ds-border)] px-3 py-2"
              placeholder=""
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="primary">{JOB_DETAIL_TEXT.buttons.saveResult}</Button>
          <Button>{JOB_DETAIL_TEXT.buttons.print}</Button>
        </div>
      </SectionCard>
    </div>
  );
}
