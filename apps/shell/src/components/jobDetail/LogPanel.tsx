import { SectionCard } from "@/components/ui";

export function LogPanel() {
  return (
    <div className="py-6 text-sm text-[var(--ds-muted)]">
      <SectionCard className="p-4">
        还没有日志记录。
      </SectionCard>
    </div>
  );
}
