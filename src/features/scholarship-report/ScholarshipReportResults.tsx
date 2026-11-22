import { useMemo } from 'react';

import { broadGroups } from '../../../shared/study-fields';
import { getPrepCourseCentres, prepCourseCentreLabel } from '../../../shared/prep-course-centres';
import { scholarshipReportIntakeYear } from '../../../shared/scholarship-report';
import { getUniversityById } from '../../../shared/universities';
import { CountryFlag } from '../../components/CountryFlag';
import { DashboardCard } from '../../components/DashboardCard';
import { SearchableSelect } from '../../components/SearchableSelect';
import { useI18n } from '../../i18n/context';
import { formatCountryLabel } from '../../lib/country-label';
import type { ScholarshipReportSummaryState } from './useScholarshipReport';

function centreLabel(centreId: string): string {
  const centre = getPrepCourseCentres(scholarshipReportIntakeYear).find((entry) => entry.id === centreId);
  return centre ? prepCourseCentreLabel(centre) : centreId;
}

function universityLabel(universityId: string): string {
  return getUniversityById(universityId)?.name ?? universityId;
}

function formatShare(count: number, total: number, locale: string): string {
  if (total <= 0) return '0%';
  return new Intl.NumberFormat(locale === 'be' ? 'ru-RU' : locale, {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(count / total);
}

type ScholarshipReportResultsProps = {
  summary: ScholarshipReportSummaryState;
  selectedCountry: string | null;
  onSelectCountry: (country: string) => void;
  onRetry: () => void;
};

/**
 * The contributors-only results view (ADR 0016). It opens on all countries, filters by the survey's country of
 * citizenship and shows every count from one, with no ladder and no additional "other" row.
 */
export function ScholarshipReportResults({
  summary,
  selectedCountry,
  onSelectCountry,
  onRetry,
}: ScholarshipReportResultsProps) {
  const { t, locale } = useI18n();
  const copy = t.scholarshipReport.results;
  const data = summary.data;

  const countries = useMemo(() => {
    const items = [...(data?.countries ?? [])];
    return items.sort(
      (left, right) =>
        right.count - left.count ||
        formatCountryLabel(left.country, locale).localeCompare(formatCountryLabel(right.country, locale), locale),
    );
  }, [data, locale]);

  const filterOptions = useMemo(
    () => [
      { value: '', label: copy.allCountries },
      ...countries.map((country) => ({
        value: country.country,
        label: `${formatCountryLabel(country.country, locale)} · ${country.count}`,
        leading: <CountryFlag code={country.country} size={16} />,
      })),
    ],
    [countries, copy.allCountries, locale],
  );

  const centres = useMemo(() => {
    const items = [...(data?.centres ?? [])];
    return items.sort(
      (left, right) => right.count - left.count || centreLabel(left.centreId).localeCompare(centreLabel(right.centreId), locale),
    );
  }, [data, locale]);

  const fields = useMemo(() => {
    const groupName = (group: string) =>
      group === 'other' ? copy.otherFieldGroup : (broadGroups[group]?.[locale] ?? group);
    const items = (data?.fields ?? []).map((field) => ({
      ...field,
      name: groupName(field.group),
      programmes: [...field.programmes].sort(
        (left, right) => right.count - left.count || left.programmeName.localeCompare(right.programmeName, locale),
      ),
    }));
    return items.sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, locale));
  }, [data, copy.otherFieldGroup, locale]);

  const universities = useMemo(() => {
    const items = [...(data?.universities ?? [])];
    return items.sort(
      (left, right) =>
        right.count - left.count || universityLabel(left.universityId).localeCompare(universityLabel(right.universityId), locale),
    );
  }, [data, locale]);

  const ready = summary.status === 'ready' && data !== null;
  const selected = selectedCountry ?? '';

  return (
    <div className="space-y-4" data-testid="scholarship-results">
      <h1 className="px-1 text-lg font-semibold text-[var(--text-primary)]">{copy.title}</h1>

      <DashboardCard tone="muted">
        <SearchableSelect
          label={copy.filterLabel}
          value={selected}
          placeholder={copy.allCountries}
          searchPlaceholder={copy.filterLabel}
          options={filterOptions}
          onChange={onSelectCountry}
        />
      </DashboardCard>

      {summary.status === 'error' ? (
        <div className="space-y-2" role="alert">
          <p className="text-sm text-[var(--tg-theme-destructive-text-color)]">{copy.loadError}</p>
          <button
            type="button"
            className="min-h-11 w-full rounded-xl border border-[var(--tg-theme-hint-color)] px-4 py-2 text-sm font-semibold"
            onClick={onRetry}
          >
            {copy.retry}
          </button>
        </div>
      ) : null}

      {summary.status === 'loading' || summary.status === 'idle' ? (
        <p className="text-sm text-[var(--tg-theme-subtitle-text-color)]" role="status">
          {copy.loading}
        </p>
      ) : null}

      {ready && data.total === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">{copy.empty}</p>
      ) : null}

      {ready && data.total > 0 ? (
        <>
          <DashboardCard tone="muted">
            <p className="text-sm text-[var(--text-secondary)]">
              {copy.totalLabel}:{' '}
              <span
                className="text-base font-semibold text-[var(--text-primary)]"
                data-testid="scholarship-results-total"
              >
                {data.total}
              </span>
            </p>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{copy.pathsTitle}</h2>
              <ul className="space-y-1 text-sm">
                {(['preparatory_course', 'direct_studies'] as const).map((route) => {
                  const count = data.paths.find((path) => path.route === route)?.count ?? 0;
                  return (
                    <li key={route} className="flex items-start justify-between gap-3">
                      <span className="text-[var(--text-secondary)]">{t.scholarshipReport.routes[route]}</span>
                      <span className="text-right font-medium">
                        {copy.countAndShare(String(count), formatShare(count, data.total, locale))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </DashboardCard>

          {centres.length > 0 ? (
            <DashboardCard tone="muted">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{copy.centresTitle}</h2>
              <ul className="space-y-1 text-sm">
                {centres.map((centre) => (
                  <li key={centre.centreId} className="flex items-start justify-between gap-3">
                    <span className="min-w-0 text-[var(--text-secondary)]">{centreLabel(centre.centreId)}</span>
                    <span className="shrink-0 font-medium">{centre.count}</span>
                  </li>
                ))}
              </ul>
            </DashboardCard>
          ) : null}

          {fields.length > 0 || data.typedProgrammeCount > 0 ? (
            <DashboardCard tone="muted">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{copy.fieldsTitle}</h2>
              <div className="space-y-3">
                {fields.map((field) => (
                  <div key={field.group} className="space-y-1">
                    <div className="flex items-start justify-between gap-3 text-sm">
                      <h3 className="font-semibold">{field.name}</h3>
                      <span className="shrink-0 font-medium">{field.count}</span>
                    </div>
                    <ul className="space-y-1 pl-3 text-sm">
                      {field.programmes.map((programme) => (
                        <li key={programme.programmeId} className="flex items-start justify-between gap-3">
                          <span className="min-w-0 text-[var(--text-secondary)]">{programme.programmeName}</span>
                          <span className="shrink-0 font-medium">{programme.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {data.typedProgrammeCount > 0 ? (
                  <div className="flex items-start justify-between gap-3 border-t border-[var(--section-divider-color)] pt-2 text-sm">
                    <span className="text-[var(--text-secondary)]">{copy.manualRow}</span>
                    <span className="shrink-0 font-medium" data-testid="scholarship-typed-count">
                      {data.typedProgrammeCount}
                    </span>
                  </div>
                ) : null}
              </div>
            </DashboardCard>
          ) : null}

          {universities.length > 0 ? (
            <DashboardCard tone="muted">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{copy.universitiesTitle}</h2>
              <ul className="space-y-1 text-sm">
                {universities.map((university) => (
                  <li key={university.universityId} className="flex items-start justify-between gap-3">
                    <span className="min-w-0 text-[var(--text-secondary)]">
                      {universityLabel(university.universityId)}
                    </span>
                    <span className="shrink-0 font-medium">{university.count}</span>
                  </li>
                ))}
              </ul>
            </DashboardCard>
          ) : null}

          <p className="px-1 text-[13px] text-[var(--text-secondary)]">{copy.caption}</p>
        </>
      ) : null}
    </div>
  );
}
