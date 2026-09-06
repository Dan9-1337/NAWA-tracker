import type { ReactNode } from 'react';

export type DashboardCardTone = 'neutral' | 'hero' | 'muted' | 'positive' | 'destructive';

type DashboardCardProps = {
  tone?: DashboardCardTone;
  className?: string;
  children: ReactNode;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  id?: string;
  role?: string;
};

const toneClass: Record<DashboardCardTone, string> = {
  neutral:
    'rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] border border-transparent',
  hero: 'dashboard-card-hero rounded-2xl border',
  muted:
    'rounded-2xl border border-[var(--section-divider-color)] bg-[var(--tg-theme-section-bg-color)]',
  positive:
    'rounded-2xl border border-[color-mix(in_srgb,var(--color-positive)_35%,var(--section-divider-color))] bg-[var(--tg-theme-secondary-bg-color)]',
  destructive:
    'rounded-2xl border border-[color-mix(in_srgb,var(--tg-theme-destructive-text-color)_35%,var(--section-divider-color))] bg-[var(--tg-theme-secondary-bg-color)]',
};

export function DashboardCard({
  tone = 'neutral',
  className,
  children,
  ...props
}: DashboardCardProps) {
  return (
    <section
      className={`${toneClass[tone]} px-3.5 py-3 space-y-3${className ? ` ${className}` : ''}`}
      {...props}
    >
      {children}
    </section>
  );
}

type CardHeaderProps = {
  title: string;
  titleId?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  titleClassName?: string;
};

export function CardHeader({ title, titleId, icon, badge, titleClassName }: CardHeaderProps) {
  return (
    <div className="flex items-start gap-2.5">
      {icon ? (
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-accent)_12%,var(--tg-theme-secondary-bg-color))] text-[var(--color-accent)]"
          aria-hidden="true"
        >
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
          <h2
            id={titleId}
            className={
              titleClassName ??
              'text-sm font-semibold leading-snug text-[var(--text-primary)]'
            }
          >
            {title}
          </h2>
          {badge ? <div className="shrink-0">{badge}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function CardFootnote({ children }: { children: ReactNode }) {
  return <p className="card-footnote">{children}</p>;
}

type DashboardSectionGroupProps = {
  label: string;
  footnote?: string;
  children: ReactNode;
};

export function DashboardSectionGroup({ label, footnote, children }: DashboardSectionGroupProps) {
  return (
    <div className="dashboard-section-group space-y-3">
      <h3 className="dashboard-section-group__label">{label}</h3>
      <div className="space-y-3">{children}</div>
      {footnote ? <CardFootnote>{footnote}</CardFootnote> : null}
    </div>
  );
}
