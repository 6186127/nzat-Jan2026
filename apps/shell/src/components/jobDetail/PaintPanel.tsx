import { EmptyState } from "@/components/ui";

type PaintPanelProps = {
  onAdd?: () => void;
};

export function PaintPanel({ onAdd }: PaintPanelProps) {
  return <EmptyState message="没有任何数据" actionLabel="添加" onAction={onAdd} />;
}
