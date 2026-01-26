import { useState } from "react";
import { useParams } from "react-router-dom";
import type { JobDetailTabKey } from "@/types";
import { jobDetailMock, JobDetailLayout, MainColumn } from "@/features/jobDetail";
import { RightSidebar } from "@/components/jobDetail/RightSidebar";

export function JobDetailPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<JobDetailTabKey>("WOF");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [hasWofRecord, setHasWofRecord] = useState(false);

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
