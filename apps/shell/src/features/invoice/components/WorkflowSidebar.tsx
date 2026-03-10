import { Check, Circle } from "lucide-react";
import type { WorkflowStep } from "../types";

type Props = {
  steps: WorkflowStep[];
  currentStep: number;
};

export function WorkflowSidebar({ steps, currentStep }: Props) {
  return (
    <div className="sticky top-6 rounded-[18px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 text-[28px] font-semibold tracking-[-0.03em] text-slate-900">Workflow Progress</div>
      <div className="space-y-0">
        {steps.map((step, index) => {
          const isDone = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isUpcoming = step.id > currentStep;

          return (
            <div key={step.id} className="relative flex gap-4 pb-6 last:pb-0">
              {index < steps.length - 1 ? (
                <div className={`absolute left-[21px] top-12 h-[calc(100%-12px)] w-px ${isDone ? "bg-blue-500" : "bg-slate-200"}`} />
              ) : null}
              <div
                className={[
                  "relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                  isDone ? "border-blue-500 bg-blue-500 text-white" : "",
                  isCurrent ? "border-blue-500 bg-white text-blue-600 shadow-[0_0_0_5px_rgba(59,130,246,0.12)]" : "",
                  isUpcoming ? "border-slate-300 bg-slate-50 text-slate-400" : "",
                ].join(" ")}
              >
                {isDone ? <Check className="h-5 w-5" /> : isCurrent ? step.id : <Circle className="h-4 w-4 fill-current stroke-none" />}
              </div>
              <div className="pt-1">
                <div className={`text-[15px] font-semibold ${isUpcoming ? "text-slate-400" : isCurrent ? "text-blue-600" : "text-slate-900"}`}>
                  {step.title}
                </div>
                <div className={`mt-1 text-sm ${isUpcoming ? "text-slate-400" : "text-slate-500"}`}>{step.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
