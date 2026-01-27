import { useState } from "react";
import type { JobDetailTabKey } from "@/types";

type UseJobDetailStateProps = {
  initialTab?: JobDetailTabKey;
  initialSidebarOpen?: boolean;
  initialHasWofRecord?: boolean;
};

export function useJobDetailState({
  initialTab = "WOF",
  initialSidebarOpen = true,
  initialHasWofRecord = false,
}: UseJobDetailStateProps = {}) {
  const [activeTab, setActiveTab] = useState<JobDetailTabKey>(initialTab);
  const [isSidebarOpen, setIsSidebarOpen] = useState(initialSidebarOpen);
  const [hasWofRecord, setHasWofRecord] = useState(initialHasWofRecord);

  return {
    activeTab,
    setActiveTab,
    isSidebarOpen,
    setIsSidebarOpen,
    hasWofRecord,
    setHasWofRecord,
  };
}
