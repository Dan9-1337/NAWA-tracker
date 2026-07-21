import type { ReactNode } from 'react';

type FormSectionProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <section className="rounded-2xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-section-bg-color)] p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--tg-theme-subtitle-text-color)]">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
