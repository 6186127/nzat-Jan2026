import type { WofCheckItem, WofFailReason, WofRecordUpdatePayload } from "@/types";
import { WofResultsCard } from "./WofResultsCard";

type WofResultsListProps = {
  isLoading?: boolean;
  checkItems: WofCheckItem[];
  onUpdate?: (id: string, payload: WofRecordUpdatePayload) => Promise<{ success: boolean; message?: string }>;
  failReasons?: WofFailReason[];
};

export function WofResultsList({ isLoading, checkItems, onUpdate, failReasons }: WofResultsListProps) {
  if (isLoading) {
    return <div className="py-6 text-center text-sm text-[var(--ds-muted)]">加载中...</div>;
  }

  if (!checkItems.length) return null;

  return <WofResultsCard wofResults={checkItems} onUpdate={onUpdate} failReasons={failReasons} />;
}
