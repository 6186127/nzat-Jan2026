import { useState } from "react";
import { Button, SectionCard } from "@/components/ui";
import { JOB_DETAIL_TEXT } from "@/features/jobDetail/jobDetail.constants";
import { EmptyPanel } from "./EmptyPanel";
import { WofResultsCard } from "./WofResultsCard";
import { ExternalLink, RefreshCw, Save, Printer } from 'lucide-react';

type WofPanelProps = {
  hasRecord: boolean;
  onAdd: () => void;
};

export function WofPanel({ hasRecord, onAdd }: WofPanelProps) {
  const [result, setResult] = useState<"Pass" | "Fail">("Pass");
  const [expiryDate, setExpiryDate] = useState("");
  const [failReason, setFailReason] = useState("");
  const [note, setNote] = useState("");
  const [results, setResults] = useState<
    { date: string; id: string; result: "Pass" | "Fail"; expiryDate: string; failReason: string; note: string }[]
  >([
    {
      date: "2024-03-15",
      id: "seed-1",
      result: "Pass",
      expiryDate: "",
      failReason: "",
      note: "Initial check passed.",
    },
    {
      date: "2024-03-18",
      id: "seed-2",
      result: "Fail",
      expiryDate: "2024-03-20",
      failReason: "Brakes",
      note: "Rear brake pads below limit.",
    },
    {
      date: "2024-03-20",
      id: "seed-3",
      result: "Fail",
      expiryDate: "2024-03-25",
      failReason: "Lights",
      note: "Left headlight not working.",
    },
  ]);

  const onSaveResult = () => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setResults((prev) => [
      ...prev,
      {
        date: new Date().toISOString().split("T")[0],
        id,
        result,
        expiryDate: result === "Fail" ? expiryDate : "",
        failReason: result === "Fail" ? failReason : "",
        note,
      },
    ]);
    setResult("Pass");
    setExpiryDate("");
    setFailReason("");
    setNote("");
  };

  if (!hasRecord) {
    return <EmptyPanel onAdd={onAdd} />;
  }

  return (
    <div className="space-y-5 py-4">
      <SectionCard
        title={JOB_DETAIL_TEXT.labels.wofRecords}
        actions={
          <div className="flex items-center gap-2">
           
            <Button variant="primary" >{JOB_DETAIL_TEXT.buttons.print}</Button>
          </div>
        }
      >
        <div className="mt-3 rounded-[12px] border border-[var(--ds-border)] p-4 mb-4 flex items-center ">
          <button className="text-sm text-[rgba(0,0,0,0.55)] underline">Empty WOF Records</button>
       <div className="ml-auto flex items-center gap-2">
        
         <Button ><ExternalLink className="w-4 h-4" />
               {JOB_DETAIL_TEXT.buttons.openNzta}
         </Button>

            <Button> <RefreshCw className="w-4 h-4" />
                {JOB_DETAIL_TEXT.buttons.refresh}</Button>
       </div>
        </div>
             {results.length ? (
      // add mutil WofResultsCard component here
      <WofResultsCard
        wofResults={results.map((r) => ({
          id: r.id,
          date: r.date,
          source: "Manual Entry",
          status: r.result,
          expiryDate: r.expiryDate,
          notes: r.note,
          failReason: r.failReason,
        }))}
        onDelete={(id) => setResults((prev) => prev.filter((entry) => entry.id !== id))}
      />
      ) : null}
      </SectionCard>

   

 

         <SectionCard title={JOB_DETAIL_TEXT.labels.result}>
        <div className="mt-4 space-y-3 text-sm">
          <div>
            <div className="text-xs text-[var(--ds-muted)]">{JOB_DETAIL_TEXT.labels.initiateResult}</div>
            <select
              className="mt-2 h-9 w-full rounded-[8px] border border-[var(--ds-border)] px-3"
              value={result}
              onChange={(event) => setResult(event.target.value as "Pass" | "Fail")}
            >
              <option>Pass</option>
              <option>Fail</option>
            </select>
          </div>
          {result === "Fail" ? (
            <>
              <div>
                <div className="text-xs text-[var(--ds-muted)]">{JOB_DETAIL_TEXT.labels.expiryDate}</div>
                <input
                  type="date"
                  className="mt-2 h-9 w-full rounded-[8px] border border-[var(--ds-border)] px-3"
                  value={expiryDate}
                  onChange={(event) => setExpiryDate(event.target.value)}
                />
              </div>
              <div>
                <div className="text-xs text-[var(--ds-muted)]">{JOB_DETAIL_TEXT.labels.failReason}</div>
                <select
                  className="mt-2 h-9 w-full rounded-[8px] border border-[var(--ds-border)] px-3"
                  value={failReason}
                  onChange={(event) => setFailReason(event.target.value)}
                >
                  <option>Fail list...</option>
                  <option value="Brakes">Brakes</option>
                  <option value="Lights">Lights</option>
                  <option value="Tyres">Tyres</option>
                </select>
              </div>
            </>
          ) : null}
          <div>
            <div className="text-xs text-[var(--ds-muted)]">{JOB_DETAIL_TEXT.labels.note}</div>
            <textarea
              className="mt-2 h-24 w-full rounded-[8px] border border-[var(--ds-border)] px-3 py-2"
              placeholder=""
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="primary" onClick={onSaveResult}>
            {JOB_DETAIL_TEXT.buttons.saveResult}
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
