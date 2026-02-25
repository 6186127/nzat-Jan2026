import type React from "react";
import { Card } from "./Card";

type SectionCardProps = {
  title?: React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  titleIcon?: React.ReactNode;
  titleClassName?: string;
  children: React.ReactNode;
};

export function SectionCard({
  title,
  subtitle,
  actions,
  className = "",
  titleIcon,
  titleClassName = "",
  children,
}: SectionCardProps) {
  return (
    <Card className={["p-4", className].join(" ")}>
      {(title || subtitle || actions) && (
        <div className="flex items-start justify-between gap-3">
          <div>
            {title ? (
              <div className={["flex items-center gap-2 text-sm font-semibold", titleClassName].join(" ")}>
                {titleIcon ? <span className="text-[var(--ds-primary)]">{titleIcon}</span> : null}
                <span>{title}</span>
              </div>
            ) : null}
            {subtitle ? <div className="text-xs text-[var(--ds-muted)]">{subtitle}</div> : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      )}
      {children}
    </Card>
  );
}
