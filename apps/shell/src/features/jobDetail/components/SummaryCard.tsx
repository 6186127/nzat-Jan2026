import { useEffect, useState } from "react";
import { Car, User, Building2, Phone, Mail, Link, RefreshCw, Pencil } from "lucide-react";
import { Button, Card, Input } from "@/components/ui";
import type { VehicleInfo, CustomerInfo } from "@/types";

interface SummaryCardProps {
  vehicle: VehicleInfo;
  customer: CustomerInfo;
  onRefreshVehicle?: () => Promise<{ success: boolean; message?: string }>;
  onSaveVehicle?: (payload: {
    year?: number | null;
    make?: string | null;
    fuelType?: string | null;
    vin?: string | null;
    nzFirstRegistration?: string | null;
  }) => Promise<{ success: boolean; message?: string }>;
}

export function SummaryCard({ vehicle, customer, onRefreshVehicle, onSaveVehicle }: SummaryCardProps) {
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [vehicleForm, setVehicleForm] = useState({
    year: "",
    make: "",
    fuelType: "",
    vin: "",
    nzFirstRegistration: "",
  });

  useEffect(() => {
    if (!refreshMessage) return;
    const timer = window.setTimeout(() => setRefreshMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [refreshMessage]);

  useEffect(() => {
    if (!refreshError) return;
    const timer = window.setTimeout(() => setRefreshError(null), 3000);
    return () => window.clearTimeout(timer);
  }, [refreshError]);

  const handleRefreshVehicle = async () => {
    if (!onRefreshVehicle || refreshing) return;
    setRefreshing(true);
    setRefreshMessage(null);
    setRefreshError(null);
    try {
      const result = await onRefreshVehicle();
      if (result.success) {
        setRefreshMessage(result.message || "抓取成功");
      } else {
        setRefreshError(result.message || "抓取失败，请稍后重试");
      }
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : "抓取失败，请稍后重试");
    } finally {
      setRefreshing(false);
    }
  };

  const openEditVehicle = () => {
    setVehicleForm({
      year: vehicle.year ? String(vehicle.year) : "",
      make: vehicle.make ?? "",
      fuelType: vehicle.fuelType ?? "",
      vin: vehicle.vin ?? "",
      nzFirstRegistration: vehicle.nzFirstRegistration ?? "",
    });
    setSaveError(null);
    setEditingVehicle(true);
  };

  const handleSaveVehicle = async () => {
    if (!onSaveVehicle || savingVehicle) return;
    const yearValue = vehicleForm.year.trim();
    const parsedYear = yearValue ? Number(yearValue) : null;
    if (yearValue && !Number.isFinite(parsedYear)) {
      setSaveError("年份格式不正确");
      return;
    }

    setSavingVehicle(true);
    setSaveError(null);
    const res = await onSaveVehicle({
      year: parsedYear,
      make: vehicleForm.make.trim() || null,
      fuelType: vehicleForm.fuelType.trim() || null,
      vin: vehicleForm.vin.trim() || null,
      nzFirstRegistration: vehicleForm.nzFirstRegistration.trim() || null,
    });
    setSavingVehicle(false);
    if (res.success) {
      setEditingVehicle(false);
    } else {
      setSaveError(res.message || "保存失败");
    }
  };

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
    
            <p className="text-2xl font-semibold text-[var(--ds-text)] mb-1">
              {vehicle.plate}{" "}
              <span className="inline-flex items-center gap-2">
                <a
                  className="text-sm font-medium text-[var(--ds-ghost)] underline underline-offset-2 inline-flex items-center gap-1"
                  href={`https://www.carjam.co.nz/car/?plate=${encodeURIComponent(vehicle.plate)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Link className="w-4 h-4" aria-hidden="true" />
                </a>
                <button
                  type="button"
                  className="text-[var(--ds-ghost)] hover:text-[var(--ds-text)]"
                  onClick={handleRefreshVehicle}
                  aria-label="刷新车辆信息"
                  disabled={refreshing || !onRefreshVehicle}
                >
                  <RefreshCw className={["w-4 h-4", refreshing ? "animate-spin" : ""].join(" ")} />
                </button>
                <button
                  type="button"
                  className="text-[var(--ds-ghost)] hover:text-[var(--ds-text)]"
                  onClick={openEditVehicle}
                  aria-label="编辑车辆信息"
                  disabled={!onSaveVehicle}
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </span>
            </p>
            {refreshMessage ? <div className="text-xs text-green-600">{refreshMessage}</div> : null}
            {refreshError ? <div className="text-xs text-red-600">{refreshError}</div> : null}
            <p className="text-sm text-[var(--ds-muted)]">
              {vehicle.year} - {vehicle.make} {vehicle.model} - {vehicle.fuelType}
            </p>
            <p className="text-sm text-[var(--ds-muted)]">{vehicle.vin}</p>
          
             <p className="text-sm text-[var(--ds-muted)]">
              NZ First Registration: {vehicle.nzFirstRegistration}
            </p>
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
              {customer.type === "Business" && customer.businessCode ? (
                <div className="flex items-center gap-2 text-sm text-[var(--ds-muted)]">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Code: {customer.businessCode}</span>
                </div>
              ) : null}
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
      {editingVehicle ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-[12px] bg-white p-5 shadow-xl">
            <div className="text-lg font-semibold text-[var(--ds-text)]">编辑车辆信息</div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-[var(--ds-muted)]">年份</label>
                <Input
                  type="number"
                  value={vehicleForm.year}
                  onChange={(event) => setVehicleForm((prev) => ({ ...prev, year: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--ds-muted)]">品牌</label>
                <Input
                  value={vehicleForm.make}
                  onChange={(event) => setVehicleForm((prev) => ({ ...prev, make: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--ds-muted)]">燃油类型</label>
                <Input
                  value={vehicleForm.fuelType}
                  onChange={(event) => setVehicleForm((prev) => ({ ...prev, fuelType: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--ds-muted)]">VIN</label>
                <Input
                  value={vehicleForm.vin}
                  onChange={(event) => setVehicleForm((prev) => ({ ...prev, vin: event.target.value }))}
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs text-[var(--ds-muted)]">NZ First Registration</label>
                <Input
                  type="date"
                  value={vehicleForm.nzFirstRegistration}
                  onChange={(event) =>
                    setVehicleForm((prev) => ({ ...prev, nzFirstRegistration: event.target.value }))
                  }
                />
              </div>
            </div>
            {saveError ? <div className="mt-2 text-xs text-red-600">{saveError}</div> : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button onClick={() => setEditingVehicle(false)} disabled={savingVehicle}>
                取消
              </Button>
              <Button variant="primary" onClick={handleSaveVehicle} disabled={savingVehicle}>
                保存
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
