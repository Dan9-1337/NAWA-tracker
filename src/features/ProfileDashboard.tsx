import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ResponseFormInput } from '../../shared/contracts';
import { calculateNawaOrientationScore } from '../../shared/nawa-score';
import { useI18n } from '../i18n/context';
import { cohortFieldsChanged } from '../lib/cohort-fields';
import { saveWizardDraft, responseToDraft, type WizardDraft } from '../lib/draft';
import { trackProductEvent } from '../lib/product-events';
import { useGuardedSubmit } from '../lib/useGuardedSubmit';
import { useMiniAppChrome, type MiniAppChromeConfig } from '../lib/useMiniAppChrome';
import { scrollAppToTop, useScrollToTopOnChange } from '../lib/useScrollToTop';
import {
  canAdvanceWizardStep,
  ResponseWizardSteps,
  toResponseInput,
  type WizardStep,
} from './ResponseWizardSteps';
import { ProfileDetails } from './score/ProfileDetails';
import { ScoreScreen } from './score/ScoreScreen';
import {
  StatisticsDistribution,
  StatisticsPanel,
  type StatisticsState,
} from './statistics/StatisticsPanel';
import { useWizardSteps } from './useWizardSteps';

type View = 'dashboard' | 'edit-wizard';

type ProfileDashboardProps = {
  current: ResponseFormInput;
  statistics: StatisticsState;
  onSubmit: (value: ResponseFormInput) => void | Promise<void>;
  disabled?: boolean;
  actionError?: string | null;
  chromeSuspended?: boolean;
  editRequestNonce?: number;
  onStatsUpdatedAt?: (updatedAt: string | null) => void;
};

export function ProfileDashboard({
  current,
  statistics,
  onSubmit,
  disabled = false,
  actionError,
  chromeSuspended = false,
  editRequestNonce = 0,
  onStatsUpdatedAt,
}: ProfileDashboardProps) {
  const { t } = useI18n();
  const [view, setView] = useState<View>('dashboard');
  const [editDraft, setEditDraft] = useState<WizardDraft>(() => responseToDraft(current));
  const {
    stepIndex: editStepIndex,
    currentStep: editCurrentStep,
    goNext: goEditNext,
    goBack: goEditBack,
    jumpToSection: jumpToEditStep,
    resetToStart: resetEditSteps,
  } = useWizardSteps();
  const { pending, run: runGuarded } = useGuardedSubmit();
  const [saved, setSaved] = useState(false);
  const [cohortWarning, setCohortWarning] = useState(false);
  const [statsUpdatedAt, setStatsUpdatedAt] = useState<string | null>(null);
  const lastProcessedStatisticsRef = useRef<unknown>(null);
  const whatIfTracked = useRef(false);

  const noteWhatIfUsed = useCallback(() => {
    if (whatIfTracked.current) return;
    whatIfTracked.current = true;
    void trackProductEvent({ name: 'what_if_used' });
  }, []);

  useEffect(() => {
    setEditDraft(responseToDraft(current));
  }, [current]);

  useEffect(() => {
    if (statistics.status !== 'success' && statistics.status !== 'suppressed') return;
    // Guard against stamping the same payload twice (e.g. React StrictMode's double effect invocation).
    if (lastProcessedStatisticsRef.current === statistics.data) return;
    lastProcessedStatisticsRef.current = statistics.data;
    setStatsUpdatedAt(new Date().toISOString());
  }, [statistics]);

  useEffect(() => {
    onStatsUpdatedAt?.(statsUpdatedAt);
  }, [onStatsUpdatedAt, statsUpdatedAt]);

  // A new view, wizard step or tab starts at its top.
  useScrollToTopOnChange(view, editStepIndex);

  // The saved confirmation sits at the top of the dashboard, so bring it into view.
  useEffect(() => {
    if (saved) scrollAppToTop();
  }, [saved]);

  useEffect(() => {
    if (!saved) return undefined;
    const id = window.setTimeout(() => setSaved(false), 3500);
    return () => window.clearTimeout(id);
  }, [saved]);

  // The warning belongs to the values the user is about to save, so any edit asks for confirmation again.
  useEffect(() => {
    setCohortWarning(false);
  }, [editDraft]);

  const userOrientationScore = useMemo(() => {
    if (current.scholarshipTrack !== 'nawa_director') return null;
    return calculateNawaOrientationScore(
      current.averageGrade,
      current.maximumGrade,
      current.polishSchoolLevel ?? 'none',
      current.rankingCountry,
      current.applicantKind,
    );
  }, [current]);

  const submitEdit = useCallback(async () => {
    if (disabled || !canAdvanceWizardStep('grades', editDraft)) return;
    const next = toResponseInput(editDraft);
    if (cohortFieldsChanged(current, next).length > 0 && !cohortWarning) {
      setCohortWarning(true);
      return;
    }
    await runGuarded(async () => {
      await onSubmit(next);
      void trackProductEvent({ name: 'survey_updated' });
      setView('dashboard');
      setCohortWarning(false);
      setSaved(true);
    });
  }, [cohortWarning, current, disabled, editDraft, onSubmit, runGuarded]);

  const openEditAt = useCallback(
    (section: WizardStep) => {
      setEditDraft(responseToDraft(current));
      setCohortWarning(false);
      setView('edit-wizard');
      jumpToEditStep(section);
    },
    [current, jumpToEditStep],
  );

  const startEdit = useCallback(() => {
    setEditDraft(responseToDraft(current));
    resetEditSteps();
    setCohortWarning(false);
    setView('edit-wizard');
  }, [current, resetEditSteps]);

  useEffect(() => {
    if (editRequestNonce > 0) startEdit();
  }, [editRequestNonce, startEdit]);

  const cancelCohortWarning = useCallback(() => {
    setCohortWarning(false);
  }, []);

  const leaveEditWizard = useCallback(() => {
    if (cohortWarning) {
      cancelCohortWarning();
      return;
    }
    goEditBack(() => setView('dashboard'));
  }, [cancelCohortWarning, cohortWarning, goEditBack]);

  function chromeConfig(): MiniAppChromeConfig {
    if (chromeSuspended) return {};
    if (view === 'dashboard') return {};
    const onGradesStep = editCurrentStep === 'grades';
    return {
      main: {
        text: onGradesStep
          ? cohortWarning
            ? t.form.cohortChangeConfirm
            : t.form.submitUpdate
          : t.wizard.next,
        visible: true,
        enabled: !disabled && !pending && canAdvanceWizardStep(editCurrentStep, editDraft),
        loading: onGradesStep && pending,
        onClick: onGradesStep ? submitEdit : () => goEditNext(editDraft),
      },
      ...(onGradesStep && cohortWarning
        ? {
            secondary: {
              text: t.form.cohortChangeCancel,
              visible: true,
              enabled: !pending,
              onClick: cancelCohortWarning,
            },
          }
        : {}),
      back: { visible: true, onClick: leaveEditWizard },
      closingConfirmation: true,
    };
  }

  useMiniAppChrome(chromeConfig());

  useEffect(() => {
    if (view === 'edit-wizard') {
      saveWizardDraft(editDraft);
    }
  }, [editDraft, view]);

  if (view === 'edit-wizard') {
    return (
      <>
        <ResponseWizardSteps draft={editDraft} onDraftChange={setEditDraft} stepIndex={editStepIndex} />
        {cohortWarning ? (
          <div className="mt-4 rounded-2xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-secondary-bg-color)] px-4 py-3 text-sm">
            <p className="font-semibold">{t.form.cohortChangeTitle}</p>
            <p className="mt-1 text-[var(--tg-theme-subtitle-text-color)]">{t.form.cohortChangeBody}</p>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className="space-y-3">
      {saved ? (
        <p className="text-sm text-[var(--tg-theme-success-text-color)]" role="status" aria-live="polite">
          ✓ {t.form.saved}
        </p>
      ) : null}

      <StatisticsPanel state={statistics} profile={current} userScore={userOrientationScore} />
      <ScoreScreen current={current} statistics={statistics} onWhatIfUsed={noteWhatIfUsed} />
      <StatisticsDistribution state={statistics} profile={current} userScore={userOrientationScore} />
      <ProfileDetails current={current} onEditSection={openEditAt} />

      {actionError ? (
        <p className="text-sm text-[var(--tg-theme-destructive-text-color)]" role="alert">
          {actionError}
        </p>
      ) : null}
    </div>
  );
}
