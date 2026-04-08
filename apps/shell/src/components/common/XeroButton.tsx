import { Button } from "@/components/ui";

type XeroButtonProps = {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  title?: string;
  showIcon?: boolean;
};

export function getXeroInvoiceUrl(externalInvoiceId?: string) {
  const invoiceId = externalInvoiceId?.trim();
  return invoiceId
    ? `https://go.xero.com/AccountsReceivable/View.aspx?invoiceID=${encodeURIComponent(invoiceId)}`
    : "https://go.xero.com";
}

export function XeroIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="10" fill="#13B5EA" />
      <path
        d="M8.1 8.4h2.2l1.7 2.5 1.7-2.5h2.2l-2.8 3.9 3 4.3h-2.2l-1.9-2.8-1.9 2.8H7.9l3-4.3-2.8-3.9z"
        fill="#fff"
      />
    </svg>
  );
}

export function XeroButton({
  onClick,
  disabled = false,
  className = "",
  label = "Open Xero",
  title = "Open in Xero",
  showIcon = true,
}: XeroButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      title={title}
      leftIcon={showIcon ? <XeroIcon /> : undefined}
      className={[
        "inline-flex items-center gap-2 rounded-[10px] border border-[#13B5EA]/25 bg-white px-4 text-[#13B5EA] hover:bg-[#13B5EA]/[0.06]",
        className,
      ].join(" ")}
    >
      {label}
    </Button>
  );
}
