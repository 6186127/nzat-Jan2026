import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui";
import { requestJson } from "@/utils/api";

type InvoicePaymentRow = {
  id: string;
  jobId: string;
  jobInvoiceId: string;
  invoiceNumber: string;
  xeroInvoiceId: string;
  contact: string;
  issueDate: string;
  reference: string;
  paymentWay: string;
  paymentDate: string;
  paymentDateTime: string;
  amount: number;
  externalStatus: string;
  createdAt: string;
};

function formatPaymentWay(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "cash") return "Cash";
  if (normalized === "epost") return "ePost";
  if (normalized === "bank_transfer") return "Bank Transfer";
  return value || "-";
}

export function InvoicePage() {
  const [rows, setRows] = useState<InvoicePaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      const res = await requestJson<{ payments?: InvoicePaymentRow[] }>("/api/invoice-payments");
      if (cancelled) return;

      if (!res.ok) {
        setError(res.error || "Failed to load invoice payments.");
        setLoading(false);
        return;
      }

      const payments = Array.isArray(res.data?.payments) ? res.data!.payments : [];
      setRows(payments);
      setExpandedDates(
        payments.reduce<Record<string, boolean>>((acc, row, index) => {
          if (!(row.paymentDate in acc)) acc[row.paymentDate] = index === 0;
          return acc;
        }, {})
      );
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, InvoicePaymentRow[]>();
    rows.forEach((row) => {
      const existing = map.get(row.paymentDate) ?? [];
      existing.push(row);
      map.set(row.paymentDate, existing);
    });
    return Array.from(map.entries()).map(([date, items]) => ({
      date,
      items,
    }));
  }, [rows]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-[rgba(0,0,0,0.72)]">Invoice Payment</h1>
     </div>

      {loading ? <Card className="p-5 text-sm text-[var(--ds-muted)]">Loading invoice payments...</Card> : null}
      {!loading && error ? <Card className="p-5 text-sm text-red-600">{error}</Card> : null}
      {!loading && !error && groups.length === 0 ? (
        <Card className="p-5 text-sm text-[var(--ds-muted)]">目前没有 invoice payment 记录。</Card>
      ) : null}

      {!loading && !error
        ? groups.map((group) => {
            const isExpanded = expandedDates[group.date] ?? false;
            return (
              <Card key={group.date} className="overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                  onClick={() => setExpandedDates((prev) => ({ ...prev, [group.date]: !isExpanded }))}
                >
                  <div>
                    <div className="text-lg font-semibold text-[var(--ds-text)]">{group.date}</div>
                    <div className="mt-1 text-sm text-[var(--ds-muted)]">Invoice 总数：{group.items.length}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-[8px] border border-[rgba(0,0,0,0.10)] bg-white px-2 py-1 text-sm text-[var(--ds-muted)]">
                    <span>{isExpanded ? "Collapse" : "Expand"}</span>
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </span>
                </button>

                {isExpanded ? (
                  <div className="border-t border-[var(--ds-border)]">
                    <div className="grid grid-cols-[140px_1.1fr_120px_1.4fr_140px_170px] gap-3 bg-[rgba(0,0,0,0.03)] px-5 py-3 text-xs font-semibold uppercase tracking-[0.04em] text-[var(--ds-muted)]">
                      <div>Invoice Number</div>
                      <div>Contact</div>
                      <div>Issue Date</div>
                      <div>Reference</div>
                      <div>Payment Way</div>
                      <div>Payment Datetime</div>
                    </div>
                    <div>
                      {group.items.map((row) => (
                        <div
                          key={row.id}
                          className="grid grid-cols-[140px_1.1fr_120px_1.4fr_140px_170px] gap-3 border-t border-[var(--ds-border)] px-5 py-4 text-sm text-[var(--ds-text)] first:border-t-0"
                        >
                          <div className="font-medium">{row.invoiceNumber || row.xeroInvoiceId || "-"}</div>
                          <div>{row.contact || "-"}</div>
                          <div>{row.issueDate || "-"}</div>
                          <div className="break-words">{row.reference || "-"}</div>
                          <div>{formatPaymentWay(row.paymentWay)}</div>
                          <div>{row.paymentDateTime || row.paymentDate || "-"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </Card>
            );
          })
        : null}
    </div>
  );
}
