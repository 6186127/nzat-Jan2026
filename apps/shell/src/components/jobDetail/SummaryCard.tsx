import { Car, User, Building2, Phone, Mail } from "lucide-react";
import { Card } from "@/components/ui";
import type { VehicleInfo, CustomerInfo } from "@/types";

interface SummaryCardProps {
  vehicle: VehicleInfo;
  customer: CustomerInfo;
}

export function SummaryCard({ vehicle, customer }: SummaryCardProps) {
  return (
    <Card className="p-6">
      <div className="grid grid-cols-2 gap-6">
        {/* Vehicle Column */}
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-lg bg-[var(--ds-border)] flex items-center justify-center">
              <Car className="w-6 h-6 text-[var(--ds-primary)]" />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-xs text-[var(--ds-muted)] mb-1">Vehicle</p>
            <p className="text-2xl font-semibold text-[var(--ds-text)] mb-1">{vehicle.plate}</p>
            <p className="text-sm text-[var(--ds-muted)]">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </p>
            <p className="text-sm text-[var(--ds-muted)]">{vehicle.vin}</p>
          </div>
        </div>

        {/* Customer Column */}
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-lg bg-[var(--ds-border)] flex items-center justify-center">
              {customer.type === 'Business' ? (
                <Building2 className="w-6 h-6 text-[var(--ds-primary)]" />
              ) : (
                <User className="w-6 h-6 text-[var(--ds-primary)]" />
              )}
            </div>
          </div>
          <div className="flex-1">
            <p className="text-xs text-[var(--ds-muted)] mb-1">Customer ({customer.type})</p>
            <p className="text-xl font-semibold text-[var(--ds-text)] mb-2">{customer.name}</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-[var(--ds-muted)]">
                <Phone className="w-3.5 h-3.5" />
                <span>{customer.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--ds-muted)]">
                <Mail className="w-3.5 h-3.5" />
                <span>{customer.email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
