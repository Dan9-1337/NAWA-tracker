import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  ScholarshipReport,
  ScholarshipReportInput,
  ScholarshipReportSummary,
  StudyRoute,
} from '../../../shared/contracts';
import { isCustomProgrammeTextValid } from '../../../shared/scholarship-report';
import { useI18n } from '../../i18n/context';
import type { Messages } from '../../i18n/types';
import {
  ApiClientError,
  createScholarshipReport,
  deleteScholarshipReport,
  getScholarshipReport,
  getScholarshipReportSummary,
  updateScholarshipReport,
} from '../../lib/api-client';

export type ScholarshipFlowStep = 'path' | 'centre' | 'programme' | 'university';
export type ScholarshipReportMode = 'dashboard' | 'flow' | 'results';

export type ScholarshipFlowDraft = {
  /** Empty until the path is chosen; the flow starts on the path step. */
  studyRoute: StudyRoute | '';
  prepCentreId: string;
  programmeId: string;
  customProgramme: string;
  /** UI only: true while the person types a kierunek instead of choosing one from the catalogue. */
  manualProgramme: boolean;
  universityId: string;
};

export function scholarshipFlowSteps(route: StudyRoute | ''): readonly ScholarshipFlowStep[] {
  return route === 'direct_studies'
    ? ['path', 'programme', 'university']
    : ['path', 'centre', 'programme', 'university'];
}

export function scholarshipFlowStepIsValid(
  step: ScholarshipFlowStep,
  draft: ScholarshipFlowDraft,
): boolean {
  switch (step) {
    case 'path':
      return draft.studyRoute !== '';
    case 'centre':
      return draft.studyRoute === 'preparatory_course' && draft.prepCentreId.length > 0;
    case 'programme':
      return draft.manualProgramme
        ? isCustomProgrammeTextValid(draft.customProgramme)
        : draft.programmeId.length > 0;
    case 'university':
      return draft.universityId.length > 0;
  }
}

export function scholarshipDraftIsValid(draft: ScholarshipFlowDraft): boolean {
  return scholarshipFlowSteps(draft.studyRoute).every((step) =>
    scholarshipFlowStepIsValid(step, draft),
  );
}

export function draftFromReport(report: ScholarshipReport | null): ScholarshipFlowDraft {
  return {
    studyRoute: report?.studyRoute ?? '',
    prepCentreId: report?.prepCentreId ?? '',
    programmeId: report?.programmeId ?? '',
    customProgramme: report?.customProgramme ?? '',
    manualProgramme: report !== null && report.programmeId === undefined,
    universityId: report?.universityId ?? '',
  };
}

/** Only called after `scholarshipDraftIsValid`, which guarantees a route and exactly one kierunek. */
export function draftToReportInput(draft: ScholarshipFlowDraft): ScholarshipReportInput {
  if (draft.studyRoute === '') throw new Error('The study path is missing.');

  return {
    studyRoute: draft.studyRoute,
    ...(draft.studyRoute === 'preparatory_course' ? { prepCentreId: draft.prepCentreId } : {}),
    ...(draft.manualProgramme
      ? { customProgramme: draft.customProgramme.trim() }
      : { programmeId: draft.programmeId }),
    universityId: draft.universityId,
  };
}

function apiErrorMessage(error: unknown, t: Messages): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'SCORE_BELOW_THRESHOLD') return t.scholarshipReport.errors.scoreBelowThreshold;
    if (error.code === 'REPORT_EXISTS') return t.scholarshipReport.errors.exists;
    if (error.code === 'REPORT_NOT_FOUND') return t.scholarshipReport.errors.notFound;
    if (error.code === 'PROFILE_NOT_FOUND') return t.scholarshipReport.errors.profileNotFound;
  }
  return t.home.actionError;
}

type ReportState = {
  status: 'disabled' | 'loading' | 'ready' | 'error';
  report: ScholarshipReport | null;
};

export type ScholarshipReportSummaryState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data: ScholarshipReportSummary | null;
};

/**
 * Owns the scholarship-holder card, its four-step flow and the results view. The report is loaded only for an
 * eligible survey (2026 Director, score at least 60); everything else is disabled.
 */
export function useScholarshipReport(enabled: boolean) {
  const { t } = useI18n();
  const [load, setLoad] = useState<ReportState>(() =>
    enabled ? { status: 'loading', report: null } : { status: 'disabled', report: null },
  );
  const [reloadToken, setReloadToken] = useState(0);
  const [mode, setMode] = useState<ScholarshipReportMode>('dashboard');
  const [draft, setDraft] = useState<ScholarshipFlowDraft | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [summary, setSummary] = useState<ScholarshipReportSummaryState>({ status: 'idle', data: null });
  const summaryRequest = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setLoad({ status: 'disabled', report: null });
      setMode('dashboard');
      setDraft(null);
      setError(null);
      setSummary({ status: 'idle', data: null });
      return undefined;
    }

    let cancelled = false;
    setLoad({ status: 'loading', report: null });

    void (async () => {
      try {
        const result = await getScholarshipReport();
        if (!cancelled) setLoad({ status: 'ready', report: result.report });
      } catch {
        if (!cancelled) setLoad({ status: 'error', report: null });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, reloadToken]);

  const reload = useCallback(() => setReloadToken((value) => value + 1), []);

  const openFlow = useCallback(() => {
    setDraft(draftFromReport(load.report));
    setEditing(load.report !== null);
    setStepIndex(0);
    setError(null);
    setMode('flow');
  }, [load.report]);

  const updateDraft = useCallback((patch: Partial<ScholarshipFlowDraft>) => {
    setDraft((current) => {
      if (!current) return current;

      const next = { ...current, ...patch };
      if (next.studyRoute !== 'preparatory_course') next.prepCentreId = '';
      if (patch.manualProgramme === true) next.programmeId = '';
      if (patch.manualProgramme === false) next.customProgramme = '';
      if (patch.programmeId !== undefined) {
        next.manualProgramme = false;
        next.customProgramme = '';
      }
      return next;
    });
    setError(null);
  }, []);

  const steps = scholarshipFlowSteps(draft?.studyRoute ?? '');
  const currentStepIndex = Math.min(stepIndex, steps.length - 1);
  const step = steps[currentStepIndex]!;
  const stepValid = draft !== null && scholarshipFlowStepIsValid(step, draft);
  const isLastStep = currentStepIndex === steps.length - 1;

  const save = useCallback(async () => {
    if (!draft || pending || !scholarshipDraftIsValid(draft)) return;

    setPending(true);
    setError(null);
    try {
      const input = draftToReportInput(draft);
      const result = editing
        ? await updateScholarshipReport({ report: input })
        : await createScholarshipReport({ report: input });

      setLoad({ status: 'ready', report: result.report });
      setDraft(null);
      setMode('dashboard');
      setSummary({ status: 'idle', data: null });
      setSelectedCountry(null);
    } catch (cause) {
      setError(apiErrorMessage(cause, t));
    } finally {
      setPending(false);
    }
  }, [draft, editing, pending, t]);

  const next = useCallback(() => {
    if (!draft || pending || !scholarshipFlowStepIsValid(step, draft)) return;

    setError(null);
    if (currentStepIndex < steps.length - 1) {
      setStepIndex(currentStepIndex + 1);
      return;
    }
    void save();
  }, [draft, pending, step, currentStepIndex, steps.length, save]);

  const back = useCallback(() => {
    if (pending) return;

    if (currentStepIndex > 0) {
      setStepIndex(currentStepIndex - 1);
      setError(null);
      return;
    }

    setDraft(null);
    setMode('dashboard');
    setError(null);
  }, [pending, currentStepIndex]);

  const remove = useCallback(async () => {
    if (pending) return;

    setPending(true);
    setError(null);
    try {
      await deleteScholarshipReport();
      setLoad({ status: 'ready', report: null });
      setSummary({ status: 'idle', data: null });
      setSelectedCountry(null);
      setMode('dashboard');
    } catch {
      setError(t.scholarshipReport.errors.delete);
    } finally {
      setPending(false);
    }
  }, [pending, t]);

  const fetchSummary = useCallback(async (country: string | null) => {
    const requestId = summaryRequest.current + 1;
    summaryRequest.current = requestId;
    setSummary((current) => ({ status: 'loading', data: current.data }));

    try {
      const data = await getScholarshipReportSummary(country ?? undefined);
      if (summaryRequest.current === requestId) setSummary({ status: 'ready', data });
    } catch {
      if (summaryRequest.current === requestId) {
        setSummary((current) => ({ status: 'error', data: current.data }));
      }
    }
  }, []);

  const openResults = useCallback(() => {
    if (!load.report) return;

    setMode('results');
    setSelectedCountry(null);
    setSummary({ status: 'idle', data: null });
    void fetchSummary(null);
  }, [load.report, fetchSummary]);

  const closeResults = useCallback(() => {
    summaryRequest.current += 1;
    setMode('dashboard');
    setSelectedCountry(null);
  }, []);

  const selectCountry = useCallback(
    (country: string) => {
      const value = country === '' ? null : country;
      setSelectedCountry(value);
      void fetchSummary(value);
    },
    [fetchSummary],
  );

  const retrySummary = useCallback(() => {
    void fetchSummary(selectedCountry);
  }, [fetchSummary, selectedCountry]);

  return {
    load,
    reload,
    mode,
    draft,
    steps,
    step,
    stepIndex: currentStepIndex,
    stepValid,
    isLastStep,
    editing,
    pending,
    error,
    summary,
    selectedCountry,
    openFlow,
    updateDraft,
    next,
    back,
    save,
    remove,
    openResults,
    closeResults,
    selectCountry,
    retrySummary,
  };
}

export type ScholarshipReportController = ReturnType<typeof useScholarshipReport>;
