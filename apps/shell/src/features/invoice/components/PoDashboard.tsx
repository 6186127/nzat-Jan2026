import { Link2 } from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import type { InvoiceDashboardModel } from "../hooks/useInvoiceDashboardState";
import { EmailTimeline } from "./EmailTimeline";
import { PoDetectionPanel } from "./PoDetectionPanel";
import { PoRequestPanel } from "./PoRequestPanel";
import { ReminderPanel } from "./ReminderPanel";

type PoDashboardProps = {
  model: InvoiceDashboardModel;
};

export function PoDashboard({ model }: PoDashboardProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
      <div className="min-w-0">
        <EmailTimeline events={model.timeline} />
      </div>

      <div className="space-y-6">
        <PoRequestPanel
          merchantEmail={model.invoice.merchantEmail}
          correlationId={model.invoice.correlationId}
          snapshotTotal={model.invoice.snapshotTotal}
          emailStates={model.invoice.emailStates}
          previewOpen={model.previewOpen}
          onTogglePreview={() => model.setPreviewOpen(!model.previewOpen)}
          onSendRequest={model.sendPoRequest}
        />
        <ReminderPanel
          lastEmailSent={model.invoice.lastEmailSent}
          lastReplyReceived={model.invoice.lastReplyReceived}
          remindersSent={model.invoice.remindersSent}
          reminderLimit={model.invoice.reminderLimit}
          nextReminderIn={model.invoice.nextReminderIn}
          onConfigure={model.configureReminders}
          onSendNow={model.sendReminderNow}
        />
        <Card className="rounded-[18px] p-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <div className="mb-2 text-sm font-medium text-slate-700">Received PO #</div>
              <Input
                value={model.manualPoNumber}
                onChange={(event) => model.setManualPoNumber(event.target.value)}
                placeholder="Input PO number"
              />
            </div>
            <Button
              variant="primary"
              className="h-11 px-5"
              leftIcon={<Link2 className="h-4 w-4" />}
              onClick={model.syncManualPoToInvoiceReference}
            >
              Sync to Invoice Ref
            </Button>
          </div>
          <div className="mt-3 text-sm text-slate-500">Current invoice reference: {model.invoice.reference}</div>
        </Card>
        <PoDetectionPanel
          detections={model.detections}
          selectedDetectionId={model.selectedDetectionId}
          onSelect={model.setSelectedDetectionId}
          onConfirm={model.confirmPo}
          onReject={model.rejectPo}
        />
      </div>
    </div>
  );
}
