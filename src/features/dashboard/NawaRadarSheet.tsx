import { useMemo, useState } from 'react';
import type { StatisticsResult } from '../../../shared/contracts';
import { useI18n } from '../../i18n/context';
import { formatCountryLabel } from '../../lib/country-label';
import {
  buildRadarFeed,
  filterRadarEvents,
  radarFilters,
  type RadarEvent,
  type RadarFilter,
} from '../../lib/radar-feed';
import { ChevronIcon } from '../../components/icons';

type NawaRadarSheetProps = {
  open: boolean;
  onClose: () => void;
  data: StatisticsResult;
  rankingCountry: string;
};

function eventText(
  t: ReturnType<typeof useI18n>['t'],
  locale: ReturnType<typeof useI18n>['locale'],
  event: RadarEvent,
): string {
  const country = event.country ? formatCountryLabel(event.country, locale) : '';

  switch (event.kind) {
    case 'country_detailed_opened':
      return t.radar.events.countryDetailed(country);
    case 'country_sample_growth':
      return t.radar.events.countryGrowth(country, String(event.count ?? 0));
    case 'global_growth':
      return t.radar.events.globalGrowth(String(event.count ?? 0));
    case 'status_pulse':
      return t.radar.events.statusPulse(country, String(event.count ?? 0));
    case 'merit_pulse':
      return t.radar.events.meritPulse(country, String(event.count ?? 0));
    case 'community_milestone':
      return event.milestoneId
        ? t.milestones.celebration[event.milestoneId]
        : t.radar.events.productUpdate;
    case 'product_update':
      return t.radar.events.productUpdate;
    default:
      return t.radar.events.productUpdate;
  }
}

export function NawaRadarSheet({ open, onClose, data, rankingCountry }: NawaRadarSheetProps) {
  const { t, locale } = useI18n();
  const [filter, setFilter] = useState<RadarFilter>('all');

  const events = useMemo(
    () => buildRadarFeed({ data, rankingCountry }),
    [data, rankingCountry],
  );

  const visible = useMemo(
    () => filterRadarEvents(events, filter, rankingCountry),
    [events, filter, rankingCountry],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]" role="presentation">
      <button
        type="button"
        aria-label={t.radar.close}
        className="absolute inset-0 bg-[var(--overlay-scrim)]"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="nawa-radar-title"
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[min(85vh,var(--tg-viewport-stable-height,100dvh))] w-full max-w-md flex-col rounded-t-3xl bg-[var(--tg-theme-section-bg-color)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-3">
          <div
            className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--tg-theme-hint-color)]"
            aria-hidden="true"
          />
          <div className="relative flex min-h-11 items-center justify-center">
            <button
              type="button"
              className="absolute left-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-secondary-bg-color)]"
              onClick={onClose}
            >
              <ChevronIcon className="rotate-180" size={18} />
              <span className="sr-only">{t.radar.close}</span>
            </button>
            <h2 id="nawa-radar-title" className="px-14 text-center text-lg font-semibold">
              {t.radar.title}
            </h2>
          </div>

          <p className="mt-2 text-xs leading-5 text-[var(--text-helper)]">{t.radar.privacy}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {radarFilters.map((id) => (
              <button
                key={id}
                type="button"
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  filter === id
                    ? 'bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)]'
                    : 'bg-[var(--tg-theme-secondary-bg-color)] text-[var(--text-secondary)]'
                }`}
                onClick={() => setFilter(id)}
              >
                {t.radar.filters[id]}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-helper)]">
              {t.radar.today}
            </h3>
            {visible.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">{t.radar.empty}</p>
            ) : (
              <ul className="space-y-2">
                {visible.map((event) => (
                  <li
                    key={event.id}
                    className="rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] px-3.5 py-3 text-sm leading-5 text-[var(--text-primary)]"
                  >
                    {eventText(t, locale, event)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div
          className="shrink-0 border-t border-[var(--section-divider-color)] px-5 pt-3"
          style={{ paddingBottom: 'max(1rem, var(--tg-content-safe-area-inset-bottom, 0px))' }}
        >
          <button
            type="button"
            className="min-h-11 w-full rounded-2xl bg-[var(--tg-theme-button-color)] px-4 py-3 text-sm font-semibold text-[var(--tg-theme-button-text-color)]"
            onClick={onClose}
          >
            {t.radar.close}
          </button>
        </div>
      </aside>
    </div>
  );
}
