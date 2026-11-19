import { useRef, type KeyboardEvent } from 'react';
import { useI18n } from '../i18n/context';

export type DashboardTab = 'score' | 'outcomes' | 'season';

export const dashboardTabs: readonly DashboardTab[] = ['score', 'outcomes', 'season'];

type DashboardTabsProps = {
  value: DashboardTab;
  onChange: (tab: DashboardTab) => void;
};

export function DashboardTabs({ value, onChange }: DashboardTabsProps) {
  const { t } = useI18n();
  const refs = useRef<Record<DashboardTab, HTMLButtonElement | null>>({
    score: null,
    outcomes: null,
    season: null,
  });

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const move = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (move === 0) return;
    event.preventDefault();
    const next = dashboardTabs[(index + move + dashboardTabs.length) % dashboardTabs.length];
    onChange(next);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={t.tabs.label}
      className="mb-4 grid grid-cols-3 gap-1 rounded-2xl border border-[var(--section-divider-color)] bg-[var(--tg-theme-secondary-bg-color)] p-1"
    >
      {dashboardTabs.map((tab, index) => {
        const selected = tab === value;
        return (
          <button
            key={tab}
            ref={(node) => {
              refs.current[tab] = node;
            }}
            type="button"
            role="tab"
            id={`dashboard-tab-${tab}`}
            aria-selected={selected}
            aria-controls={`dashboard-panel-${tab}`}
            tabIndex={selected ? 0 : -1}
            className={`font-display min-h-11 rounded-xl text-base font-semibold tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent-ink)] ${
              selected
                ? 'bg-[var(--color-accent)] text-[#14161a]'
                : 'text-[var(--text-secondary)] active:opacity-70'
            }`}
            onClick={() => onChange(tab)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {t.tabs[tab]}
          </button>
        );
      })}
    </div>
  );
}
