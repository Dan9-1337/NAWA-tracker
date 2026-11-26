import { useId, type ReactNode } from 'react';

type DashboardPageProps = {
  title: string;
  children: ReactNode;
};

/** A page opened from the dashboard hub (ADR 0020): a title and the page's blocks. Back returns to the hub. */
export function DashboardPage({ title, children }: DashboardPageProps) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="space-y-3">
      <h2 id={titleId} className="px-1 pt-1 text-lg font-semibold leading-tight text-[var(--text-primary)]">
        {title}
      </h2>
      {children}
    </section>
  );
}
