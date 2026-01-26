import type { CustomerInfo, VehicleInfo } from "@/types";
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
            <div className="text-sm font-semibold">Information</div>
            <div className="text-xs text-[var(--ds-muted)]">Vehicle & Customer Details</div>
          </div>

          <SidebarSection title="Vehicle Details">
            <InfoRow label="Plate Number" value={vehicle.plate} />
            <InfoRow label="Make & Model" value={`${vehicle.make} ${vehicle.model}`} />
            <InfoRow label="Year" value={String(vehicle.year)} />
            <InfoRow label="WOF" value={vehicle.wofExpiry} />
          </SidebarSection>

          <SidebarSection title="Customer Details">
            <InfoRow label="Type" value={customer.type} />
            <InfoRow label="Name" value={customer.name} />
            <InfoRow label="Phone" value={customer.phone} />
            <InfoRow label="Email" value={customer.email} />
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
