import { useParams } from "react-router-dom";
import { jobDetailMock, JobDetailLayout, MainColumn, useJobDetailState } from "@/features/jobDetail";
import { RightSidebar } from "@/components/jobDetail/RightSidebar";

export function JobDetailPage() {
  const { id } = useParams();
  const { activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen, hasWofRecord, setHasWofRecord } =
    useJobDetailState({ initialTab: "WOF" });

  const jobData = {
    ...jobDetailMock,
    id: id ?? jobDetailMock.id,
  };

  return (
    <div className="space-y-4">
      <JobDetailLayout
        main={
          <MainColumn
            jobData={jobData}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            hasWofRecord={hasWofRecord}
            onAddWof={() => setHasWofRecord(true)}
          />
        }
        sidebar={
          <RightSidebar
            vehicle={jobData.vehicle}
            customer={jobData.customer}
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen((v) => !v)}
          />
        }
      />
    </div>
  );
}
