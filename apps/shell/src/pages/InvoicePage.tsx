import { InvoiceDashboard } from "@/features/invoice/components/InvoiceDashboard";

export function InvoicePage() {
  return (
    <div
      className="space-y-4 text-[14px]"
      style={{
        fontFamily: '"Manrope","Plus Jakarta Sans","Space Grotesk","Segoe UI",sans-serif',
      }}
    >
      <h1 className="text-2xl font-semibold text-[rgba(0,0,0,0.72)]">Invoice</h1>
      <InvoiceDashboard />
    </div>
  );
}
