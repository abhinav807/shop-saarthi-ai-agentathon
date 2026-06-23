import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

type Tone = "default" | "success" | "warning" | "danger" | "info" | "plan";

const toneClasses: Record<Tone, string> = {
  default: "bg-muted text-foreground",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning-foreground",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  plan: "bg-plan-soft text-plan",
};

export function StatusPill({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wide",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
}) {
  const accent =
    tone === "success" ? "border-l-success"
    : tone === "warning" ? "border-l-warning"
    : tone === "danger" ? "border-l-danger"
    : tone === "info" ? "border-l-info"
    : tone === "plan" ? "border-l-plan"
    : "border-l-transparent";

  return (
    <div className={cn("bg-card border rounded-lg p-5 border-l-4", accent)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("bg-card border rounded-lg", className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b">
          <div>
            {title && <h2 className="text-sm font-semibold tracking-tight">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-12">
      {icon && <div className="mx-auto size-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">{icon}</div>}
      <div className="text-sm font-medium">{title}</div>
      {description && <div className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
