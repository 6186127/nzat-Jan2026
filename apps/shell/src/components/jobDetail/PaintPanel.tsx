import { EmptyState } from "@/components/ui";
import { JOB_DETAIL_TEXT } from "@/features/jobDetail/jobDetail.constants";

type PaintPanelProps = {
  onAdd?: () => void;
};

export function PaintPanel({ onAdd }: PaintPanelProps) {
  return (
    <EmptyState
      message={JOB_DETAIL_TEXT.empty.noData}
      actionLabel={JOB_DETAIL_TEXT.buttons.add}
      onAction={onAdd}
    />
  );
}
