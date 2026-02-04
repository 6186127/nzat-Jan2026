import { SectionCard } from "@/components/ui";
import { JOB_DETAIL_TEXT } from "@/features/jobDetail/jobDetail.constants";
import type { WofCheckItem, WofFailReason, WofRecord, WofRecordUpdatePayload } from "@/types";
import { WofResultsList } from "./WofResultsList";
import { WofToolbar } from "./WofToolbar";

export type WofPanelProps = {
  hasRecord: boolean;
  onAdd: () => void;
  records: WofRecord[];
  checkItems?: WofCheckItem[];
  failReasons?: WofFailReason[];
  isLoading?: boolean;
  onRefresh?: () => Promise<{ success: boolean; message?: string }>;
  onSaveResult?: (payload: {
    result: "Pass" | "Fail";
    expiryDate?: string;
    failReasonId?: string;
    note?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  onDeleteWofServer?: () => Promise<{ success: boolean; message?: string }>;
  onUpdateRecord?: (
    id: string,
    payload: WofRecordUpdatePayload
  ) => Promise<{ success: boolean; message?: string }>;
};

export function WofPanel(props: WofPanelProps) {
  const {
    checkItems = [],
    failReasons = [],
    isLoading,
    onRefresh,
    onSaveResult,
    onDeleteWofServer,
    onUpdateRecord,
  } = props;

  return (
    <div className="space-y-5 py-4">
      <SectionCard
        title={JOB_DETAIL_TEXT.labels.wofRecords}
        actions={<WofToolbar isLoading={isLoading} onRefresh={onRefresh} onDelete={onDeleteWofServer} />}
      >
        <WofResultsList isLoading={isLoading} checkItems={checkItems} onUpdate={onUpdateRecord} failReasons={failReasons} />
      </SectionCard>

      {/* <SectionCard title={JOB_DETAIL_TEXT.labels.result}>
        <WofResultForm failReasons={failReasons} onSave={onSaveResult} />
      </SectionCard> */}
    </div>
  );
}
