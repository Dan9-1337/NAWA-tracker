import type { ReactNode } from 'react';
import { ChevronIcon } from '../icons';

export function SettingsMenuGroup({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-[var(--tg-theme-secondary-bg-color)]">
      <div className="divide-y divide-[var(--section-divider-color)]">{children}</div>
    </div>
  );
}

function SettingsMenuIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--tg-theme-bg-color)] text-[var(--color-accent-ink)]">
      {children}
    </span>
  );
}

export function SettingsMenuRow({
  label,
  value,
  onClick,
  icon,
}: {
  label: string;
  value?: string;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-h-[3.25rem] items-center gap-3 px-4 py-3 text-left text-[var(--text-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--tg-theme-hint-color)_12%,transparent)] active:bg-[color-mix(in_srgb,var(--tg-theme-hint-color)_18%,transparent)]"
    >
      <SettingsMenuIcon>{icon}</SettingsMenuIcon>
      <span className="min-w-0 flex-1 text-sm font-medium leading-snug">{label}</span>
      {value ? (
        <span className="shrink-0 text-sm text-[var(--tg-theme-subtitle-text-color)]">{value}</span>
      ) : null}
      <ChevronIcon className="shrink-0 text-[var(--tg-theme-hint-color)]" />
    </button>
  );
}
