import { Clock3, FileSearch, Mail, MailCheck, RefreshCcw, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui";
import type { EmailTimelineEvent } from "../types";

type Props = {
  events: EmailTimelineEvent[];
};

const EVENT_STYLES = {
  sent: {
    icon: <Mail className="h-4 w-4 text-blue-600" />,
    dot: "bg-blue-100",
    line: "bg-blue-100",
  },
  reminder: {
    icon: <Clock3 className="h-4 w-4 text-orange-600" />,
    dot: "bg-orange-100",
    line: "bg-orange-100",
  },
  reply: {
    icon: <MailCheck className="h-4 w-4 text-emerald-600" />,
    dot: "bg-emerald-100",
    line: "bg-emerald-100",
  },
  detected: {
    icon: <FileSearch className="h-4 w-4 text-violet-600" />,
    dot: "bg-violet-100",
    line: "bg-violet-100",
  },
  confirmed: {
    icon: <ShieldCheck className="h-4 w-4 text-emerald-700" />,
    dot: "bg-emerald-100",
    line: "bg-emerald-100",
  },
  updated: {
    icon: <RefreshCcw className="h-4 w-4 text-slate-600" />,
    dot: "bg-slate-100",
    line: "bg-slate-100",
  },
};

export function EmailTimeline({ events }: Props) {
  return (
    <Card className="rounded-[18px] p-6">
      <div className="text-[28px] font-semibold tracking-[-0.03em] text-slate-900">Email Activity Timeline</div>
      <div className="mt-6 space-y-5">
        {events.map((event, index) => (
          <div key={event.id} className="relative flex gap-4">
            {index < events.length - 1 ? (
              <div className={`absolute left-[20px] top-10 h-[calc(100%+20px)] w-px ${EVENT_STYLES[event.type].line}`} />
            ) : null}
            <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${EVENT_STYLES[event.type].dot}`}>
              {EVENT_STYLES[event.type].icon}
            </div>
            <div className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-base font-medium text-slate-900">{event.description}</div>
                <div className="text-sm text-slate-500">{event.timestamp}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
