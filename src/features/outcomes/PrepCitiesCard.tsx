import { useCallback, useEffect, useState } from 'react';
import type { PrepCityDistribution } from '../../../shared/contracts';
import { fieldLevelName } from '../../../shared/study-fields';
import { useI18n } from '../../i18n/context';
import { getPrepCityDistribution } from '../../lib/api-client';

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; data: PrepCityDistribution };

function levelLine(
  t: ReturnType<typeof useI18n>['t'],
  locale: ReturnType<typeof useI18n>['locale'],
  data: PrepCityDistribution,
): string | null {
  if (data.level === null) return null;
  if (data.level === 'all') return t.prepCities.shownAll;
  const name = fieldLevelName(data.studyField, data.level, locale) ?? '';
  if (data.level === 'detailed') return t.prepCities.shownDetailed(name);
  return data.level === 'narrow' ? t.prepCities.shownNarrow(name) : t.prepCities.shownBroad(name);
}

/** Where reporters in the applicant's field were sent for the preparatory course (docs/adr/0007). */
export function PrepCitiesCard() {
  const { t, locale } = useI18n();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    getPrepCityDistribution().then(
      (data) => {
        if (!cancelled) setState({ status: 'success', data });
      },
      () => {
        if (!cancelled) setState({ status: 'error' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const copy = t.prepCities;

  return (
    <section
      aria-labelledby="prep-cities-title"
      className="mt-3 rounded-2xl border border-[var(--section-divider-color)] bg-[var(--tg-theme-section-bg-color)] px-4 py-3"
    >
      <h3 id="prep-cities-title" className="text-base font-semibold">
        {copy.title}
      </h3>
      <p className="mt-0.5 text-[13px] leading-snug text-[var(--text-secondary)]">{copy.subtitle}</p>

      {state.status === 'loading' ? (
        <p className="mt-3 text-sm text-[var(--text-secondary)]" role="status" aria-live="polite">
          {copy.loading}
        </p>
      ) : null}

      {state.status === 'error' ? (
        <div className="mt-3 space-y-1" role="alert">
          <p className="text-sm font-medium text-[var(--tg-theme-destructive-text-color)]">{copy.error}</p>
          <button type="button" className="min-h-11 text-sm font-semibold underline underline-offset-2" onClick={retry}>
            {copy.retry}
          </button>
        </div>
      ) : null}

      {state.status === 'success' && state.data.level === null ? (
        <p className="mt-3 text-sm text-[var(--text-secondary)]">{copy.empty}</p>
      ) : null}

      {state.status === 'success' && state.data.level !== null ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium">{levelLine(t, locale, state.data)}</p>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {state.data.cities.map((entry) => (
              <li key={entry.city} className="text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span>{entry.city}</span>
                  <span className="tabular-nums text-[var(--text-secondary)]">{entry.count}</span>
                </div>
                <div
                  aria-hidden="true"
                  className="mt-0.5 h-1.5 rounded bg-[var(--color-accent)]"
                  style={{ width: `${Math.max(4, (entry.count / state.data.total) * 100)}%` }}
                />
              </li>
            ))}
          </ul>
          {state.data.otherCount > 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">{copy.otherLine(String(state.data.otherCount))}</p>
          ) : null}
          <p className="text-xs text-[var(--text-helper)]">{copy.total(String(state.data.total))}</p>
          <p className="text-xs text-[var(--text-helper)]">{copy.legend}</p>
        </div>
      ) : null}
    </section>
  );
}
