import { Check, Link2 } from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import { StatusBadge } from "./StatusBadge";
import type { PoDetection } from "../types";

type Props = {
  detections: PoDetection[];
  selectedDetectionId: string | null;
  onSelect: (id: string) => void;
  onConfirm: (id: string) => void;
  manualPoNumber: string;
  currentInvoiceReference: string;
  onManualPoNumberChange: (value: string) => void;
  onSyncManualPoToReference: () => void;
  embedded?: boolean;
};

export function PoDetectionPanel({
  detections,
  selectedDetectionId,
  onSelect,
  onConfirm,
  manualPoNumber,
  currentInvoiceReference,
  onManualPoNumberChange,
  onSyncManualPoToReference,
  embedded = false,
}: Props) {
  const normalizedManualPo = manualPoNumber.trim();
  const canSyncManualPo =
    normalizedManualPo.length > 0 && !currentInvoiceReference.toLowerCase().includes(normalizedManualPo.toLowerCase());

  const content = (
    <>
      {embedded ? null : <div className="text-[28px] font-semibold tracking-[-0.03em] text-slate-900">PO Detection Panel</div>}

      <div className={`${embedded ? "" : "mt-5 "}overflow-hidden rounded-2xl border border-slate-200`}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-sm font-semibold text-slate-700">
              <th className="px-4 py-4">PO Number</th>
              <th className="px-4 py-4">Source</th>
              <th className="px-4 py-4">Confidence Score</th>
              <th className="px-4 py-4">Evidence Preview</th>
              <th className="px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {detections.map((detection) => {
              const isConfirmed = detection.status === "confirmed";
              return (
              <tr
                key={detection.id}
                className={`border-b border-slate-100 last:border-b-0 ${
                  isConfirmed
                    ? "bg-slate-100"
                    : selectedDetectionId === detection.id
                      ? "bg-slate-50"
                      : ""
                }`}
              >
                <td className={`px-4 py-4 text-sm font-semibold ${isConfirmed ? "text-slate-500" : "text-slate-900"}`}>{detection.poNumber}</td>
                <td className="px-4 py-4">
                  <StatusBadge kind="source" value={detection.source} />
                </td>
                <td className={`px-4 py-4 text-sm font-semibold ${
                  isConfirmed ? "text-slate-500" : detection.confidence >= 90 ? "text-emerald-600" : "text-amber-600"
                }`}>
                  {detection.confidence}%
                </td>
                <td className="px-4 py-4">
                  <button
                    type="button"
                    className={`text-left text-sm ${isConfirmed ? "text-slate-500" : "text-slate-600 hover:text-slate-900"}`}
                    onClick={() => onSelect(detection.id)}
                    disabled={isConfirmed}
                  >
                    {detection.evidencePreview}
                  </button>
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant={isConfirmed ? "ghost" : "primary"}
                      className={isConfirmed ? "h-9 px-4 bg-slate-200 text-slate-500 border border-slate-300 hover:bg-slate-200" : "h-9 px-4"}
                      leftIcon={<Check className="h-4 w-4" />}
                      onClick={() => onConfirm(detection.id)}
                      disabled={isConfirmed}
                    >
                      {isConfirmed ? "Confirmed" : "Confirm"}
                    </Button>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <div className="mb-2 text-sm font-medium text-slate-700">Received PO #</div>
            <Input
              value={manualPoNumber}
              onChange={(event) => onManualPoNumberChange(event.target.value)}
              placeholder="Input PO number"
            />
          </div>
          <Button
            variant={canSyncManualPo ? "primary" : "ghost"}
            className={canSyncManualPo ? "h-11 px-5" : "h-11 px-5 bg-slate-200 text-slate-500 border border-slate-300 hover:bg-slate-200"}
            leftIcon={<Link2 className="h-4 w-4" />}
            onClick={onSyncManualPoToReference}
            disabled={!canSyncManualPo}
          >
            {canSyncManualPo ? "Sync to Invoice Ref" : "Synced to Invoice Ref"}
          </Button>
        </div>
        <div className="mt-3 text-sm text-slate-500">Current invoice reference: {currentInvoiceReference}</div>
      </div>

    </>
  );

  if (embedded) return content;

  return <Card className="rounded-[18px] p-6">{content}</Card>;
}
