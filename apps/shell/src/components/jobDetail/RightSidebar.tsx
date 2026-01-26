import type { CustomerInfo, VehicleInfo } from "@/types";
import { JOB_DETAIL_TEXT } from "@/features/jobDetail/jobDetail.constants";
import { InfoRow } from "@/components/ui";
import { SidebarSection } from "./SidebarSection";

type RightSidebarProps = {
  vehicle: VehicleInfo;
  customer: CustomerInfo;
  isOpen: boolean;
  onToggle: () => void;
};

export function RightSidebar({ vehicle, customer, isOpen, onToggle }: RightSidebarProps) {
  return (
    <aside
      className={[
        "relative rounded-[12px] border border-[var(--ds-border)] bg-white shadow-sm transition-all",
        isOpen ? "lg:w-[320px]" : "lg:w-12",
      ].join(" ")}
    >
      <button
        onClick={onToggle}
        className="absolute -left-3 top-4 h-6 w-6 rounded-full border border-[var(--ds-border)] bg-white text-xs text-[rgba(0,0,0,0.55)] shadow"
        aria-label="Toggle sidebar"
      >
        {isOpen ? "<" : ">"}
      </button>

      {isOpen ? (
        <div className="space-y-3 p-4">
          <div>
            <div className="text-sm font-semibold">{JOB_DETAIL_TEXT.labels.infoTitle}</div>
            <div className="text-xs text-[var(--ds-muted)]">{JOB_DETAIL_TEXT.labels.infoSubtitle}</div>
          </div>

          <SidebarSection title={JOB_DETAIL_TEXT.labels.vehicleDetails}>
            <InfoRow label={JOB_DETAIL_TEXT.labels.plateNumber} value={vehicle.plate} />
            <InfoRow label={JOB_DETAIL_TEXT.labels.makeModel} value={`${vehicle.make} ${vehicle.model}`} />
            <InfoRow label={JOB_DETAIL_TEXT.labels.year} value={String(vehicle.year)} />
            <InfoRow label={JOB_DETAIL_TEXT.labels.wof} value={vehicle.wofExpiry} />
          </SidebarSection>

          <SidebarSection title={JOB_DETAIL_TEXT.labels.customerDetails}>
            <InfoRow label={JOB_DETAIL_TEXT.labels.type} value={customer.type} />
            <InfoRow label={JOB_DETAIL_TEXT.labels.name} value={customer.name} />
            <InfoRow label={JOB_DETAIL_TEXT.labels.phone} value={customer.phone} />
            <InfoRow label={JOB_DETAIL_TEXT.labels.email} value={customer.email} />
          </SidebarSection>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-[rgba(0,0,0,0.45)]">
          Info
        </div>
      )}
    </aside>
  );
}
