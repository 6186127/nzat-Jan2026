import { useEffect, useState } from "react";
import { requestJson } from "@/utils/api";

export type PoUnreadJobItem = {
  jobId: string;
  correlationId: string;
  unreadReplyCount: number;
  latestReplyAt: string;
};

export type PoUnreadSummary = {
  totalUnreadReplies: number;
  affectedJobs: number;
  items: PoUnreadJobItem[];
};

const EMPTY_SUMMARY: PoUnreadSummary = {
  totalUnreadReplies: 0,
  affectedJobs: 0,
  items: [],
};

export function usePoUnreadSummary(pollMs = 60000) {
  const [summary, setSummary] = useState<PoUnreadSummary>(EMPTY_SUMMARY);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const res = await requestJson<PoUnreadSummary>("/api/jobs/po-unread-summary");
      if (!res.ok || !res.data || cancelled) return;
      setSummary({
        totalUnreadReplies: Number(res.data.totalUnreadReplies) || 0,
        affectedJobs: Number(res.data.affectedJobs) || 0,
        items: Array.isArray(res.data.items) ? res.data.items : [],
      });
    };

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, Math.max(15000, pollMs));

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pollMs]);

  return summary;
}
