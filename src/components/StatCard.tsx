type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
};

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <article className="rounded-2xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-bg-color)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tg-theme-subtitle-text-color)]">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
      {hint ? (
        <p className="mt-2 text-sm leading-6 text-[var(--tg-theme-subtitle-text-color)]">{hint}</p>
      ) : null}
    </article>
  );
}
