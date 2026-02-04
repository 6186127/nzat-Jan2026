import { EmptyPanel } from "./EmptyPanel";

type RepairPanelProps = {
  onAdd?: () => void;
};

export function RepairPanel({ onAdd }: RepairPanelProps) {
  return <EmptyPanel onAdd={onAdd} />;
}
