import { Check, X } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { StatusBadge } from "./StatusBadge";
import type { PoDetection } from "../types";

type Props = {
  detections: PoDetection[];
  selectedDetectionId: string | null;
  onSelect: (id: string) => void;
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
  embedded?: boolean;
};

export function PoDetectionPanel({
  detections,
  selectedDetectionId,
  onSelect,
  onConfirm,
  onReject,
  embedded = false,
}: Props) {
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

    </>
  );

  if (embedded) return content;

  return <Card className="rounded-[18px] p-6">{content}</Card>;
}
