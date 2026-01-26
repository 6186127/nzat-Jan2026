import { Button, SectionCard } from "@/components/ui";

export function InvoicePanel() {
  return (
    <div className="py-6 space-y-3">
      <SectionCard title="Link to Transaction">
        <div className="mt-2 text-xs text-[var(--ds-muted)]">Transaction ID</div>
        <div className="mt-2 flex items-center gap-2">
          <input
            className="h-9 flex-1 rounded-[8px] border border-[var(--ds-border)] px-3 text-sm"
            placeholder="Enter ID"
          />
          <Button>Linked</Button>
        </div>
      </SectionCard>
      <SectionCard title="Invoice Items">
        <div className="mt-2 text-[var(--ds-muted)]">暂无发票明细。</div>
      </SectionCard>
    </div>
  );
}
