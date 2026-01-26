import { EmptyState } from "@/components/ui";

type RepairPanelProps = {
  onAdd?: () => void;
};

export function RepairPanel({ onAdd }: RepairPanelProps) {
  return <EmptyState message="没有任何数据" actionLabel="添加" onAction={onAdd} />;
}
