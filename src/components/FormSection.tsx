import type { ReactNode } from 'react';

type FormSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <section className="rounded-2xl border border-[var(--section-divider-color)] bg-[var(--tg-theme-section-bg-color)] p-4 shadow-[0_1px_0_color-mix(in_srgb,var(--section-divider-color)_60%,transparent)]">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
        ) : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
