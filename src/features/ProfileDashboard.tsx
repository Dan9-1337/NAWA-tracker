import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ResponseFormInput } from '../../shared/contracts';
import { calculateNawaOrientationScore } from '../../shared/nawa-score';
import {
  scholarshipReportIntakeYear,
  scholarshipReportMinimumScore,
} from '../../shared/scholarship-report';
import { useI18n } from '../i18n/context';
import { cohortFieldsChanged } from '../lib/cohort-fields';
import { openCountryInvite } from '../lib/country-invite';
import { responseToDraft, type WizardDraft } from '../lib/draft';
import { trackProductEvent } from '../lib/product-events';
import { canShowScoreDistribution } from '../lib/score-buckets';
import { useGuardedSubmit } from '../lib/useGuardedSubmit';
import { useMiniAppChrome, type MiniAppChromeConfig } from '../lib/useMiniAppChrome';
import {
  restoreAppScroll,
  scrollAppToTop,
  useRememberedAppScroll,
  useScrollIntoViewWhenShown,
} from '../lib/useScrollToTop';
import {
  canAdvanceWizardStep,
  ResponseWizardSteps,
  toResponseInput,
  type WizardStep,
} from './ResponseWizardSteps';
import { ProfileDetails } from './score/ProfileDetails';
import { ScoreScreen } from './score/ScoreScreen';
import { ScholarshipReportCard } from './scholarship-report/ScholarshipReportCard';
import { ScholarshipReportFlow } from './scholarship-report/ScholarshipReportFlow';
import { ScholarshipReportResults } from './scholarship-report/ScholarshipReportResults';
import { useScholarshipReport } from './scholarship-report/useScholarshipReport';
import {
  StatisticsDistribution,
  StatisticsPanel,
  type StatisticsState,
} from './statistics/StatisticsPanel';
import { DashboardPage } from './dashboard/DashboardPage';
import { HubLink } from './dashboard/HubLink';
import { useOrientationMark } from './dashboard/useOrientationMark';
import { useWizardSteps } from './useWizardSteps';

/** The hub, its two pages (ADR 0020) and the edit wizard. Pages are views held here, not URL routes. */
type View = 'hub' | 'what-if' | 'profile' | 'edit-wizard';

/** Where Back from the first step of the edit wizard goes: the Profile page that opened it, or the hub. */
type EditReturn = 'hub' | 'profile';

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
  const { t, locale } = useI18n();
  const [view, setView] = useState<View>('hub');
  const [editReturn, setEditReturn] = useState<EditReturn>('hub');
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

  // Only a 2026 Director survey at or above the merit threshold is invited (ADR 0017); everyone else is disabled.
  const scholarshipReportEligible =
    current.scholarshipTrack === 'nawa_director' &&
    current.intakeYear === scholarshipReportIntakeYear &&
    userOrientationScore !== null &&
    userOrientationScore >= scholarshipReportMinimumScore;
  const scholarship = useScholarshipReport(scholarshipReportEligible);

  // The country mark is for every 2026 Director survey, whether or not it has a report (ADR 0017). Its holder
  // score list is requested only once the full distribution is on screen.
  const orientationMarkEligible =
    current.scholarshipTrack === 'nawa_director' &&
    current.intakeYear === scholarshipReportIntakeYear;
  const hasFullDistribution =
    statistics.status === 'success' && canShowScoreDistribution(statistics.data.scoreBuckets);
  const report = scholarship.load.report;
  const reportRevision = report ? `report:${report.scoreSnapshot}` : 'none';
  const orientationMark = useOrientationMark(
    orientationMarkEligible,
    current.rankingCountry,
    orientationMarkEligible && hasFullDistribution,
    reportRevision,
  );
  const orientation = orientationMark.data;
  const orientationInvite = scholarshipReportEligible ? scholarship.openFlow : undefined;

  // A page, a wizard step and a holder flow step or results open at their top. The hub comes back at the scroll
  // position the user left it at (ADR 0020).
  const screen =
    scholarship.mode === 'flow'
      ? `holder-flow:${scholarship.stepIndex}`
      : scholarship.mode === 'results'
        ? 'holder-results'
        : view === 'edit-wizard'
          ? `edit-wizard:${editStepIndex}`
          : view;
  const hubScroll = useRememberedAppScroll(screen === 'hub');
  useLayoutEffect(() => {
    if (screen === 'hub') restoreAppScroll(hubScroll.current);
    else scrollAppToTop();
  }, [hubScroll, screen]);

  const submitEdit = useCallback(async () => {
    if (disabled || !canAdvanceWizardStep('grades', editDraft)) return;
    const next = toResponseInput(editDraft, current.intakeYear);
    if (cohortFieldsChanged(current, next).length > 0 && !cohortWarning) {
      setCohortWarning(true);
      return;
    }
    await runGuarded(async () => {
      await onSubmit(next);
      void trackProductEvent({ name: 'survey_updated' });
      // The saved line sits at the top of the hub, so the hub opens at its top after a save (task 027).
      hubScroll.current = 0;
      setView('hub');
      setCohortWarning(false);
      setSaved(true);
    });
  }, [cohortWarning, current, disabled, editDraft, hubScroll, onSubmit, runGuarded]);

  // Only the Profile page's rows open the wizard at a step, so Back from that step returns to the Profile page.
  const openEditAt = useCallback(
    (section: WizardStep) => {
      setEditDraft(responseToDraft(current));
      setCohortWarning(false);
      setEditReturn('profile');
      setView('edit-wizard');
      jumpToEditStep(section);
    },
    [current, jumpToEditStep],
  );

  const startEdit = useCallback(() => {
    setEditDraft(responseToDraft(current));
    resetEditSteps();
    setCohortWarning(false);
    setEditReturn('hub');
    setView('edit-wizard');
  }, [current, resetEditSteps]);

  // Each Settings request opens the wizard once. `startEdit` changes with `current`, so without the ref every save
  // (and every dashboard that mounts after an earlier request) would replay the request.
  const handledEditRequest = useRef(editRequestNonce);
  useEffect(() => {
    if (editRequestNonce === handledEditRequest.current) return;
    handledEditRequest.current = editRequestNonce;
    startEdit();
  }, [editRequestNonce, startEdit]);

  const cancelCohortWarning = useCallback(() => {
    setCohortWarning(false);
  }, []);

  const leaveEditWizard = useCallback(() => {
    if (cohortWarning) {
      cancelCohortWarning();
      return;
    }
    goEditBack(() => setView(editReturn));
  }, [cancelCohortWarning, cohortWarning, editReturn, goEditBack]);

  const backToHub = useCallback(() => setView('hub'), []);

  function chromeConfig(): MiniAppChromeConfig {
    if (chromeSuspended) return {};

    if (scholarship.mode === 'flow' && scholarship.draft) {
      return {
        main: {
          text: scholarship.isLastStep ? t.scholarshipReport.save : t.wizard.next,
          visible: true,
          enabled: !disabled && !scholarship.pending && scholarship.stepValid,
          loading: scholarship.isLastStep && scholarship.pending,
          onClick: scholarship.isLastStep
            ? () => void scholarship.save()
            : scholarship.next,
        },
        back: { visible: true, onClick: scholarship.back },
        closingConfirmation: true,
      };
    }

    if (scholarship.mode === 'results') {
      return { back: { visible: true, onClick: scholarship.closeResults } };
    }

    // The pages have no main button yet (task 048 adds the invite to the What-if page).
    if (view === 'what-if' || view === 'profile') {
      return { back: { visible: true, onClick: backToHub } };
    }

    if (view === 'hub') {
      return {
        main: {
          text: t.settings.invite,
          visible: true,
          enabled: true,
          onClick: () => {
            void trackProductEvent({ name: 'invite_main_button_opened' });
            openCountryInvite(current.rankingCountry, locale, t.settings.inviteText);
          },
        },
      };
    }
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

  const editErrorRef = useScrollIntoViewWhenShown<HTMLParagraphElement>(actionError);

  if (scholarship.mode === 'flow') {
    return <ScholarshipReportFlow controller={scholarship} />;
  }

  if (scholarship.mode === 'results') {
    return (
      <ScholarshipReportResults
        summary={scholarship.summary}
        selectedCountry={scholarship.selectedCountry}
        onSelectCountry={scholarship.selectCountry}
        onRetry={scholarship.retrySummary}
      />
    );
  }

  if (view === 'edit-wizard') {
    return (
      <>
        <ResponseWizardSteps draft={editDraft} onDraftChange={setEditDraft} stepIndex={editStepIndex} />
        {actionError ? (
          <p ref={editErrorRef} className="mt-4 text-sm text-[var(--tg-theme-destructive-text-color)]" role="alert">
            {actionError}
          </p>
        ) : null}
        {cohortWarning ? (
          <div className="mt-4 rounded-2xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-secondary-bg-color)] px-4 py-3 text-sm">
            <p className="font-semibold">{t.form.cohortChangeTitle}</p>
            <p className="mt-1 text-[var(--tg-theme-subtitle-text-color)]">{t.form.cohortChangeBody}</p>
          </div>
        ) : null}
      </>
    );
  }

  const dashboardError = actionError ? (
    <p className="text-sm text-[var(--tg-theme-destructive-text-color)]" role="alert">
      {actionError}
    </p>
  ) : null;

  if (view === 'what-if') {
    return (
      <DashboardPage title={t.dashboard.pages.whatIf}>
        <ScoreScreen
          current={current}
          statistics={statistics}
          orientationMark={orientation?.mark ?? null}
          onWhatIfUsed={noteWhatIfUsed}
        />
        {/* Task 052 removes the distribution; until then it stays below the what-if. */}
        <StatisticsDistribution
          state={statistics}
          profile={current}
          userScore={userOrientationScore}
          orientationScores={orientation?.scores ?? null}
        />
        {dashboardError}
      </DashboardPage>
    );
  }

  if (view === 'profile') {
    return (
      <DashboardPage title={t.dashboard.pages.profile}>
        <ProfileDetails current={current} onEditSection={openEditAt} />
        {dashboardError}
      </DashboardPage>
    );
  }

  return (
    <div className="space-y-3">
      {saved ? (
        <p className="text-sm text-[var(--tg-theme-success-text-color)]" role="status" aria-live="polite">
          ✓ {t.form.saved}
        </p>
      ) : null}

      <StatisticsPanel
        state={statistics}
        profile={current}
        userScore={userOrientationScore}
        orientation={orientation}
        onOrientationInvite={orientationInvite}
      />
      {scholarshipReportEligible ? <ScholarshipReportCard controller={scholarship} /> : null}
      <div className="space-y-2">
        <HubLink label={t.dashboard.pages.whatIf} onClick={() => setView('what-if')} />
        <HubLink label={t.dashboard.pages.profile} onClick={() => setView('profile')} />
      </div>

      {dashboardError}
    </div>
  );
}
