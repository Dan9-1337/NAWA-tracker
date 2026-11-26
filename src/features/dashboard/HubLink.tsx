import { ChevronIcon } from '../../components/icons';

type HubLinkProps = {
  label: string;
  onClick: () => void;
};

/** A full-width row on the dashboard hub that opens one of its pages (ADR 0020). */
export function HubLink({ label, onClick }: HubLinkProps) {
  return (
    <button
      type="button"
      className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl border border-[var(--section-divider-color)] bg-[var(--tg-theme-secondary-bg-color)] px-4 py-3 text-left text-base font-semibold text-[var(--text-primary)] active:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-ink)]"
      onClick={onClick}
    >
      <span>{label}</span>
      <span className="shrink-0 text-[var(--text-secondary)]">
        <ChevronIcon />
      </span>
    </button>
  );
}
