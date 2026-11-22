import { useState } from 'react';

import type { ScholarshipReport } from '../../../shared/contracts';
import { getPrepCourseCentres, prepCourseCentreLabel } from '../../../shared/prep-course-centres';
import { scholarshipReportIntakeYear } from '../../../shared/scholarship-report';
import { getUniversityById } from '../../../shared/universities';
import { DashboardCard } from '../../components/DashboardCard';
import { useI18n } from '../../i18n/context';
import type { ScholarshipReportController } from './useScholarshipReport';

function centreLabel(centreId: string | undefined): string | null {
  if (!centreId) return null;
  const centre = getPrepCourseCentres(scholarshipReportIntakeYear).find((entry) => entry.id === centreId);
  return centre ? prepCourseCentreLabel(centre) : centreId;
}

function universityName(universityId: string): string {
  return getUniversityById(universityId)?.name ?? universityId;
}

function reportProgramme(report: ScholarshipReport): string {
  return report.programmeName ?? report.customProgramme ?? report.programmeId ?? '—';
}

type ScholarshipReportCardProps = {
  controller: ScholarshipReportController;
};

/**
 * The dashboard card of the scholarship-holder survey (ADR 0012). Without a report it invites the holder; with
 * one it shows their answers and the way to the results page, to edit and to delete.
 */
export function ScholarshipReportCard({ controller }: ScholarshipReportCardProps) {
  const { t } = useI18n();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const copy = t.scholarshipReport;

  if (controller.load.status === 'disabled' || controller.load.status === 'loading') return null;

  if (controller.load.status === 'error') {
    return (
      <DashboardCard tone="muted" aria-label={copy.title}>
        <p className="text-sm text-[var(--text-secondary)]">{copy.loadError}</p>
        <button
          type="button"
          className="min-h-11 rounded-xl border border-[var(--tg-theme-hint-color)] px-4 py-2 text-sm font-semibold"
          onClick={controller.reload}
        >
          {copy.retry}
        </button>
      </DashboardCard>
    );
  }

  const report = controller.load.report;

  if (!report) {
    return (
      <DashboardCard tone="muted" aria-label={copy.title}>
        <h2 className="text-sm font-semibold leading-snug text-[var(--text-primary)]">{copy.title}</h2>
        <p className="text-sm leading-6 text-[var(--text-secondary)]">{copy.invitationBody}</p>
        <button
          type="button"
          className="min-h-11 w-full rounded-xl bg-[var(--tg-theme-button-color)] px-4 py-3 text-sm font-semibold text-[var(--tg-theme-button-text-color)]"
          onClick={controller.openFlow}
        >
          {copy.start}
        </button>
      </DashboardCard>
    );
  }

  const centre = centreLabel(report.prepCentreId);

  return (
    <DashboardCard tone="muted" aria-label={copy.title}>
      <h2 className="text-sm font-semibold leading-snug text-[var(--text-primary)]">{copy.title}</h2>

      <dl className="space-y-2 text-sm">
        <div className="flex items-start justify-between gap-3">
          <dt className="text-[var(--text-secondary)]">{copy.routeLabel}</dt>
          <dd className="text-right font-medium">{copy.routes[report.studyRoute]}</dd>
        </div>
        {centre ? (
          <div className="flex items-start justify-between gap-3">
            <dt className="text-[var(--text-secondary)]">{copy.centreLabel}</dt>
            <dd className="text-right font-medium">{centre}</dd>
          </div>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <dt className="text-[var(--text-secondary)]">{copy.programmeLabel}</dt>
          <dd className="text-right font-medium">
            {reportProgramme(report)}
            {report.customProgramme ? (
              <span className="mt-0.5 block text-xs font-normal text-[var(--text-secondary)]">
                {copy.typedByHand}
              </span>
            ) : null}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-[var(--text-secondary)]">{copy.universityLabel}</dt>
          <dd className="text-right font-medium">{universityName(report.universityId)}</dd>
        </div>
      </dl>

      {controller.error ? (
        <p className="text-sm text-[var(--tg-theme-destructive-text-color)]" role="alert">
          {controller.error}
        </p>
      ) : null}

      <button
        type="button"
        className="min-h-11 w-full rounded-xl bg-[var(--tg-theme-button-color)] px-4 py-3 text-sm font-semibold text-[var(--tg-theme-button-text-color)] disabled:opacity-50"
        disabled={controller.pending}
        onClick={controller.openResults}
      >
        {copy.openResults}
      </button>

      {confirmingDelete ? (
        <div className="space-y-3 rounded-xl border border-[var(--tg-theme-destructive-text-color)] p-3">
          <p className="text-sm font-semibold">{copy.deleteConfirmTitle}</p>
          <p className="text-sm text-[var(--text-secondary)]">{copy.deleteConfirmBody}</p>
          <button
            type="button"
            className="min-h-11 w-full rounded-xl bg-[var(--tg-theme-destructive-text-color)] px-4 py-3 text-sm font-semibold text-[var(--tg-theme-button-text-color)] disabled:opacity-50"
            disabled={controller.pending}
            onClick={() => {
              void controller.remove().finally(() => setConfirmingDelete(false));
            }}
          >
            {copy.deleteConfirm}
          </button>
          <button
            type="button"
            className="min-h-11 w-full rounded-xl border border-[var(--tg-theme-hint-color)] px-4 py-3 text-sm font-semibold"
            disabled={controller.pending}
            onClick={() => setConfirmingDelete(false)}
          >
            {copy.deleteCancel}
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            className="min-h-11 flex-1 rounded-xl border border-[var(--tg-theme-hint-color)] px-4 py-2 text-sm font-semibold disabled:opacity-50"
            disabled={controller.pending}
            onClick={controller.openFlow}
          >
            {copy.edit}
          </button>
          <button
            type="button"
            className="min-h-11 flex-1 rounded-xl border border-[var(--tg-theme-destructive-text-color)] px-4 py-2 text-sm font-semibold text-[var(--tg-theme-destructive-text-color)] disabled:opacity-50"
            disabled={controller.pending}
            onClick={() => setConfirmingDelete(true)}
          >
            {copy.delete}
          </button>
        </div>
      )}
    </DashboardCard>
  );
}
