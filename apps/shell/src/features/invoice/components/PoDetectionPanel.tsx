import { Check, FileImage, FileText, X } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { StatusBadge } from "./StatusBadge";
import type { PoDetection } from "../types";

type Props = {
  detections: PoDetection[];
  selectedDetectionId: string | null;
  onSelect: (id: string) => void;
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
};

export function PoDetectionPanel({
  detections,
  selectedDetectionId,
  onSelect,
  onConfirm,
  onReject,
}: Props) {
  const selected = detections.find((item) => item.id === selectedDetectionId) ?? null;

  return (
    <Card className="rounded-[18px] p-6">
      <div className="text-[28px] font-semibold tracking-[-0.03em] text-slate-900">PO Detection Panel</div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
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
            {detections.map((detection) => (
              <tr
                key={detection.id}
                className={`border-b border-slate-100 last:border-b-0 ${selectedDetectionId === detection.id ? "bg-slate-50" : ""}`}
              >
                <td className="px-4 py-4 text-sm font-semibold text-slate-900">{detection.poNumber}</td>
                <td className="px-4 py-4">
                  <StatusBadge kind="source" value={detection.source} />
                </td>
                <td className={`px-4 py-4 text-sm font-semibold ${detection.confidence >= 90 ? "text-emerald-600" : "text-amber-600"}`}>
                  {detection.confidence}%
                </td>
                <td className="px-4 py-4">
                  <button type="button" className="text-left text-sm text-slate-600 hover:text-slate-900" onClick={() => onSelect(detection.id)}>
                    {detection.evidencePreview}
                  </button>
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <Button variant="primary" className="h-9 px-4" leftIcon={<Check className="h-4 w-4" />} onClick={() => onConfirm(detection.id)}>
                      Confirm
                    </Button>
                    <Button className="h-9 px-4" leftIcon={<X className="h-4 w-4" />} onClick={() => onReject(detection.id)}>
                      Reject
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 p-4">
        <div className="text-xl font-semibold text-slate-900">Evidence Viewer</div>
        <div className="mt-4 flex min-h-[220px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
          {selected ? (
            <div className="flex flex-col items-center gap-4 text-center">
              {selected.previewType === "pdf" ? (
                <FileText className="h-14 w-14 text-slate-400" />
              ) : (
                <FileImage className="h-14 w-14 text-slate-400" />
              )}
              <div>
                <div className="text-lg font-semibold text-slate-900">{selected.previewLabel}</div>
                <div className="mt-2 max-w-[560px] text-sm text-slate-500">{selected.evidencePreview}</div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <FileText className="mx-auto h-14 w-14 text-slate-300" />
              <div className="mt-3 text-base text-slate-500">Select a PO to preview attachment</div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
