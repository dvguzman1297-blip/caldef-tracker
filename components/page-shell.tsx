import type { ReactNode } from "react";

/** One layout for every signed-in page: H1, optional subtitle and actions, then content. */
export function PageShell({ title, subtitle, actions, compactOnMobile, children }: {
  title: string; subtitle?: ReactNode; actions?: ReactNode;
  /** Hide the visible title and subtitle on phones (the heading stays for screen readers) to save vertical space. */
  compactOnMobile?: boolean; children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className={`flex flex-wrap items-end justify-between gap-x-4 gap-y-2 ${compactOnMobile && !actions ? "max-md:sr-only" : ""}`}>
        <div className="min-w-0">
          <h1 className={`text-2xl font-bold tracking-tight ${compactOnMobile ? "max-md:sr-only" : ""}`}>{title}</h1>
          {subtitle && <p className={`mt-1 text-sm text-muted ${compactOnMobile ? "max-md:hidden" : ""}`}>{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}
