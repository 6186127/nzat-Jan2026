import { EmptyState } from "@/components/ui";
import { JOB_DETAIL_TEXT } from "@/features/jobDetail/jobDetail.constants";

type RepairPanelProps = {
  onAdd?: () => void;
};

export function RepairPanel({ onAdd }: RepairPanelProps) {
  return (
    <EmptyState
      message={JOB_DETAIL_TEXT.empty.noData}
      actionLabel={JOB_DETAIL_TEXT.buttons.add}
      onAction={onAdd}
    />
  );
}
