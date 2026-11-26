import { useEffect, useMemo, useState } from 'react';

import type { StudyRoute } from '../../../shared/contracts';
import {
  getPrepCourseCentres,
  prepCourseCentreLabel,
} from '../../../shared/prep-course-centres';
import {
  scholarshipReportIntakeYear,
  scholarshipReportMaxCustomProgrammeLength,
} from '../../../shared/scholarship-report';
import type { StudyProgramme } from '../../../shared/study-programmes';
import { normalizeSearchText } from '../../../shared/university-search/normalize';
import { universitiesForScholarshipTrack } from '../../../shared/universities';
import { FormSection } from '../../components/FormSection';
import { RadioOption } from '../../components/RadioOption';
import { SearchableSelect } from '../../components/SearchableSelect';
import { useI18n } from '../../i18n/context';
import type { Messages } from '../../i18n/types';
import {
  scholarshipFlowStepIsValid,
  type ScholarshipFlowDraft,
  type ScholarshipFlowStep,
  type ScholarshipReportController,
} from './useScholarshipReport';

function matchesLabel(option: { label: string }, query: string): boolean {
  return normalizeSearchText(option.label).includes(normalizeSearchText(query));
}

function stepCopy(step: ScholarshipFlowStep, t: Messages) {
  const copy = t.scholarshipReport.flow;
  switch (step) {
    case 'path':
      return { title: copy.pathTitle, description: copy.pathDescription };
    case 'centre':
      return { title: copy.centreTitle, description: copy.centreDescription };
    case 'programme':
      return { title: copy.programmeTitle, description: copy.programmeDescription };
    case 'university':
      return { title: copy.universityTitle, description: copy.universityDescription };
  }
}

/** What is still missing on the step, said once below the form (the wizard does the same). */
function stepHint(step: ScholarshipFlowStep, draft: ScholarshipFlowDraft, t: Messages): string | null {
  if (scholarshipFlowStepIsValid(step, draft)) return null;

  const copy = t.scholarshipReport.flow;
  switch (step) {
    case 'path':
      return copy.choosePath;
    case 'centre':
      return copy.chooseCentre;
    case 'programme': {
      if (!draft.manualProgramme) return copy.chooseProgramme;
      if (draft.customProgramme.trim().length === 0) return copy.customRequired;
      if (/[\r\n]/.test(draft.customProgramme)) return copy.customSingleLine;
      return copy.customTooLong(scholarshipReportMaxCustomProgrammeLength);
    }
    case 'university':
      return copy.chooseUniversity;
  }
}

function PathStep({ controller }: { controller: ScholarshipReportController }) {
  const { t } = useI18n();
  const draft = controller.draft!;

  const choose = (value: StudyRoute) => controller.updateDraft({ studyRoute: value });

  return (
    <fieldset className="space-y-2">
      <RadioOption
        name="scholarship-path"
        value="preparatory_course"
        checked={draft.studyRoute === 'preparatory_course'}
        label={t.scholarshipReport.routes.preparatory_course}
        onChange={() => choose('preparatory_course')}
      />
      <RadioOption
        name="scholarship-path"
        value="direct_studies"
        checked={draft.studyRoute === 'direct_studies'}
        label={t.scholarshipReport.routes.direct_studies}
        onChange={() => choose('direct_studies')}
      />
    </fieldset>
  );
}

function CentreStep({ controller }: { controller: ScholarshipReportController }) {
  const { t } = useI18n();
  const draft = controller.draft!;

  const options = useMemo(
    () =>
      getPrepCourseCentres(scholarshipReportIntakeYear).map((centre) => ({
        value: centre.id,
        label: prepCourseCentreLabel(centre),
        subtitle: centre.city,
      })),
    [],
  );

  return (
    <SearchableSelect
      label={t.scholarshipReport.centreLabel}
      value={draft.prepCentreId}
      placeholder={t.scholarshipReport.flow.centrePlaceholder}
      searchPlaceholder={t.scholarshipReport.flow.centreSearchPlaceholder}
      options={options}
      matchesQuery={matchesLabel}
      onChange={(value) => controller.updateDraft({ prepCentreId: value })}
    />
  );
}

function ProgrammeStep({ controller }: { controller: ScholarshipReportController }) {
  const { t } = useI18n();
  const draft = controller.draft!;
  const [programmes, setProgrammes] = useState<readonly StudyProgramme[] | null>(null);
  const [listUnavailable, setListUnavailable] = useState(false);

  // The catalogue is about 1,400 entries: load it only when the person reaches this step.
  useEffect(() => {
    let cancelled = false;
    void import('../../../shared/study-programmes')
      .then((module) => {
        if (!cancelled) setProgrammes(module.studyProgrammes);
      })
      .catch(() => {
        if (!cancelled) setListUnavailable(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const options = useMemo(
    () =>
      (programmes ?? [])
        .map((programme) => ({ value: programme.id, label: programme.name }))
        .sort((left, right) => left.label.localeCompare(right.label, 'pl')),
    [programmes],
  );

  if (draft.manualProgramme) {
    return (
      <div className="space-y-2">
        <label htmlFor="scholarship-custom-programme" className="text-sm font-medium">
          {t.scholarshipReport.flow.manualLabel}
        </label>
        <input
          id="scholarship-custom-programme"
          type="text"
          value={draft.customProgramme}
          placeholder={t.scholarshipReport.flow.manualPlaceholder}
          aria-describedby="scholarship-custom-programme-hint"
          className="min-h-11 w-full rounded-xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-bg-color)] px-3 py-2 text-base"
          onChange={(event) => controller.updateDraft({ customProgramme: event.target.value })}
        />
        <p
          id="scholarship-custom-programme-hint"
          className="text-sm text-[var(--tg-theme-subtitle-text-color)]"
        >
          {t.scholarshipReport.flow.manualHint}
        </p>
        <button
          type="button"
          className="min-h-11 w-full rounded-xl border border-[var(--tg-theme-hint-color)] px-4 py-2 text-sm font-semibold"
          onClick={() => controller.updateDraft({ manualProgramme: false })}
        >
          {t.scholarshipReport.flow.chooseFromList}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {programmes ? (
        <SearchableSelect
          label={t.scholarshipReport.programmeLabel}
          value={draft.programmeId}
          placeholder={t.scholarshipReport.flow.programmePlaceholder}
          searchPlaceholder={t.scholarshipReport.flow.programmeSearchPlaceholder}
          options={options}
          matchesQuery={matchesLabel}
          onChange={(value) => controller.updateDraft({ programmeId: value })}
        />
      ) : (
        <p className="text-sm text-[var(--tg-theme-subtitle-text-color)]" role="status">
          {listUnavailable
            ? t.scholarshipReport.flow.programmeListUnavailable
            : t.scholarshipReport.flow.programmeLoading}
        </p>
      )}
      <button
        type="button"
        className="min-h-11 w-full rounded-xl border border-[var(--tg-theme-hint-color)] px-4 py-2 text-sm font-semibold"
        onClick={() => controller.updateDraft({ manualProgramme: true })}
      >
        {t.scholarshipReport.flow.manualToggle}
      </button>
    </div>
  );
}

function UniversityStep({ controller }: { controller: ScholarshipReportController }) {
  const { t } = useI18n();
  const draft = controller.draft!;

  const options = useMemo(
    () =>
      universitiesForScholarshipTrack('nawa_director')
        .map((university) => ({
          value: university.id,
          label: university.name,
          subtitle: university.city,
        }))
        .sort((left, right) => left.label.localeCompare(right.label, 'pl')),
    [],
  );

  return (
    <SearchableSelect
      label={t.scholarshipReport.universityLabel}
      value={draft.universityId}
      placeholder={t.scholarshipReport.flow.universityPlaceholder}
      searchPlaceholder={t.scholarshipReport.flow.universitySearchPlaceholder}
      options={options}
      matchesQuery={matchesLabel}
      onChange={(value) => controller.updateDraft({ universityId: value })}
    />
  );
}

/**
 * The four-step scholarship-holder flow (ADR 0012). Its main and back buttons belong to the dashboard chrome, so
 * the same Telegram handling as the edit wizard applies.
 */
export function ScholarshipReportFlow({ controller }: { controller: ScholarshipReportController }) {
  const { t } = useI18n();
  const draft = controller.draft;

  if (!draft) return null;

  const copy = stepCopy(controller.step, t);
  const hint = stepHint(controller.step, draft, t);

  return (
    <div className="space-y-4" data-testid="scholarship-flow">
      <p className="text-sm font-medium text-[var(--tg-theme-subtitle-text-color)]">
        {t.scholarshipReport.flow.stepOf(controller.stepIndex + 1, controller.steps.length)}
      </p>

      <FormSection title={copy.title} description={copy.description}>
        {controller.step === 'path' ? <PathStep controller={controller} /> : null}
        {controller.step === 'centre' ? <CentreStep controller={controller} /> : null}
        {controller.step === 'programme' ? <ProgrammeStep controller={controller} /> : null}
        {controller.step === 'university' ? <UniversityStep controller={controller} /> : null}
      </FormSection>

      {hint ? (
        <p className="text-sm text-[var(--tg-theme-subtitle-text-color)]" role="status">
          {hint}
        </p>
      ) : null}

      {controller.error ? (
        <p className="text-sm text-[var(--tg-theme-destructive-text-color)]" role="alert">
          {controller.error}
        </p>
      ) : null}
    </div>
  );
}
