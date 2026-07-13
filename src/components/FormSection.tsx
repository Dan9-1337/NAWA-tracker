import type { ReactNode } from 'react';

type FormSectionProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.06)] backdrop-blur">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
