import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ResponseFormInput } from '../../shared/contracts';
import { calculateNawaOrientationScore } from '../../shared/nawa-score';
import { nawaSystemUrl, season2026 } from '../../shared/season';
import { getStatusOptions } from '../../shared/status-options';
import { DashboardTabs, type DashboardTab } from '../components/DashboardTabs';
import { useI18n } from '../i18n/context';
import { cohortFieldsChanged } from '../lib/cohort-fields';
import { saveWizardDraft, responseToDraft, type WizardDraft } from '../lib/draft';
import { trackProductEvent } from '../lib/product-events';
import { getTelegramWebApp } from '../lib/telegram';
import { useGuardedSubmit } from '../lib/useGuardedSubmit';
import { useMiniAppChrome, type MiniAppChromeConfig } from '../lib/useMiniAppChrome';
import { scrollAppToTop, useScrollToTopOnChange } from '../lib/useScrollToTop';
import { ConfirmSummary } from './ConfirmSummary';
import { buildDashboardChrome } from './dashboard-chrome';
import {
  canAdvanceWizardStep,
  ResponseWizardSteps,
  toResponseInput,
  type WizardStep,
} from './ResponseWizardSteps';
import { OutcomesScreen } from './outcomes/OutcomesScreen';
import { ScoreScreen } from './score/ScoreScreen';
import { SeasonScreen } from './season/SeasonScreen';
import { StatisticsPanel, type StatisticsState } from './statistics/StatisticsPanel';
import { StatusReporter } from './StatusReporter';
import { useWizardSteps } from './useWizardSteps';

type View = 'dashboard' | 'edit-wizard' | 'edit-confirm';

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
  const [tab, setTab] = useState<DashboardTab>('score');
  const [currentStatus, setCurrentStatus] = useState(current.currentStatus);
  const [statusChangedAt, setStatusChangedAt] = useState(current.statusChangedAt);
  const [prepCourseCity, setPrepCourseCity] = useState(current.prepCourseCity ?? '');
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
  const [statusConfirmation, setStatusConfirmation] = useState(false);
  const [cohortWarning, setCohortWarning] = useState(false);
  const [statusEditorOpen, setStatusEditorOpen] = useState(false);
  const [statsUpdatedAt, setStatsUpdatedAt] = useState<string | null>(null);
  const lastProcessedStatisticsRef = useRef<unknown>(null);

  useEffect(() => {
    setCurrentStatus(current.currentStatus);
    setStatusChangedAt(current.statusChangedAt);
    setPrepCourseCity(current.prepCourseCity ?? '');
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
  useScrollToTopOnChange(view, editStepIndex, tab);

  // The saved-status confirmation sits at the top of the dashboard, so bring it into view.
  useEffect(() => {
    if (statusConfirmation) scrollAppToTop();
  }, [statusConfirmation]);

  useEffect(() => {
    if (!statusConfirmation) return undefined;
    const id = window.setTimeout(() => setStatusConfirmation(false), 3500);
    return () => window.clearTimeout(id);
  }, [statusConfirmation]);

  const statusOptions = useMemo(() => getStatusOptions(current.currentStatus), [current.currentStatus]);
  const statusDirty =
    currentStatus !== current.currentStatus ||
    statusChangedAt !== current.statusChangedAt ||
    prepCourseCity !== (current.prepCourseCity ?? '');
  // Final outcomes can still be corrected (awarded <-> not awarded); others have nothing left to report.
  const canReportStatus = statusOptions.length > 1;

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

  const submitStatus = useCallback(async () => {
    if (disabled || !statusDirty) return;
    await runGuarded(async () => {
      const { prepCourseCity: _previous, ...rest } = current;
      const keepsCity =
        current.studyRoute === 'preparatory_course' && currentStatus === 'scholarship_awarded' && prepCourseCity !== '';
      await onSubmit({
        ...rest,
        currentStatus,
        statusChangedAt,
        ...(keepsCity ? { prepCourseCity } : {}),
      });
      void trackProductEvent({ name: 'status_updated', from: current.currentStatus, to: currentStatus });
      setStatusConfirmation(true);
      setStatusEditorOpen(false);
    });
  }, [current, currentStatus, disabled, onSubmit, prepCourseCity, runGuarded, statusChangedAt, statusDirty]);

  const submitEdit = useCallback(async () => {
    if (disabled) return;
    const next = toResponseInput(editDraft);
    if (cohortFieldsChanged(current, next).length > 0 && !cohortWarning) {
      setCohortWarning(true);
      return;
    }
    await runGuarded(async () => {
      await onSubmit(next);
      setView('dashboard');
      setCohortWarning(false);
      setStatusConfirmation(true);
    });
  }, [cohortWarning, current, disabled, editDraft, onSubmit, runGuarded]);

  const jumpToEditSection = useCallback(
    (section: WizardStep) => {
      setView('edit-wizard');
      jumpToEditStep(section);
    },
    [jumpToEditStep],
  );

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

  const leaveConfirmStep = () => {
    if (cohortWarning) {
      cancelCohortWarning();
      return;
    }
    setView('edit-wizard');
  };

  function chromeConfig(): MiniAppChromeConfig {
    if (chromeSuspended) return {};
    if (view === 'dashboard') {
      return buildDashboardChrome({
        t,
        tab,
        disabled,
        pending,
        statusDirty,
        canReportStatus,
        statusEditorOpen,
        seasonYear: season2026.year,
        actions: {
          submitStatus: () => void submitStatus(),
          openStatusEditor: () => setStatusEditorOpen(true),
          showOutcomes: () => setTab('outcomes'),
          openOfficialSystem: () => getTelegramWebApp()?.openLink(nawaSystemUrl),
        },
      });
    }
    if (view === 'edit-wizard') {
      return {
        main: {
          text: t.wizard.next,
          visible: true,
          enabled: !disabled && canAdvanceWizardStep(editCurrentStep, editDraft),
          onClick: () => goEditNext(editDraft, () => setView('edit-confirm')),
        },
        back: {
          visible: true,
          onClick: () => goEditBack(() => setView('dashboard')),
        },
        closingConfirmation: true,
      };
    }
    return {
      main: {
        text: cohortWarning ? t.form.cohortChangeConfirm : t.form.submitUpdate,
        visible: true,
        enabled: !disabled && !pending,
        loading: pending,
        onClick: submitEdit,
      },
      secondary: {
        text: cohortWarning ? t.form.cohortChangeCancel : t.wizard.editStep,
        visible: true,
        enabled: !pending,
        onClick: leaveConfirmStep,
      },
      back: { visible: true, onClick: leaveConfirmStep },
      closingConfirmation: true,
    };
  }

  useMiniAppChrome(chromeConfig());

  useEffect(() => {
    if (view === 'edit-wizard' || view === 'edit-confirm') {
      saveWizardDraft(editDraft);
    }
  }, [editDraft, view]);

  if (view === 'edit-wizard') {
    return <ResponseWizardSteps draft={editDraft} onDraftChange={setEditDraft} stepIndex={editStepIndex} />;
  }

  if (view === 'edit-confirm') {
    return (
      <>
        <ConfirmSummary draft={toResponseInput(editDraft)} onEditSection={jumpToEditSection} />
        {cohortWarning ? (
          <div className="mt-4 rounded-2xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-secondary-bg-color)] px-4 py-3 text-sm">
            <p className="font-semibold">{t.form.cohortChangeTitle}</p>
            <p className="mt-1 text-[var(--tg-theme-subtitle-text-color)]">{t.form.cohortChangeBody}</p>
          </div>
        ) : null}
      </>
    );
  }

  const statusReporter = canReportStatus ? (
    <StatusReporter
      savedStatus={current.currentStatus}
      status={currentStatus}
      statusChangedAt={statusChangedAt}
      options={statusOptions}
      dirty={statusDirty}
      open={statusEditorOpen}
      onOpenChange={setStatusEditorOpen}
      onStatusChange={(status) => {
        setStatusConfirmation(false);
        setCurrentStatus(status);
      }}
      onDateChange={(value) => {
        setStatusConfirmation(false);
        setStatusChangedAt(value);
      }}
      showCity={current.studyRoute === 'preparatory_course'}
      prepCourseCity={prepCourseCity}
      onCityChange={(city) => {
        setStatusConfirmation(false);
        setPrepCourseCity(city);
      }}
    />
  ) : null;

  return (
    <div className="space-y-3">
      <DashboardTabs value={tab} onChange={setTab} />

      {statusConfirmation ? (
        <p className="text-sm text-[var(--tg-theme-success-text-color)]" role="status" aria-live="polite">
          ✓ {t.form.statusSaved}
        </p>
      ) : null}

      <div role="tabpanel" id={`dashboard-panel-${tab}`} aria-labelledby={`dashboard-tab-${tab}`} className="space-y-3">
        {tab === 'score' ? (
          <>
            <ScoreScreen current={current} onEditSection={openEditAt} />
            <StatisticsPanel
              state={statistics}
              profile={current}
              userScore={userOrientationScore}
            />
          </>
        ) : null}

        {tab === 'outcomes' ? (
          <>
            <OutcomesScreen
              userScore={userOrientationScore}
              showPrepCities={current.studyRoute === 'preparatory_course'}
            />
            {statusReporter}
          </>
        ) : null}

        {tab === 'season' ? <SeasonScreen status={current.currentStatus} /> : null}
      </div>

      {actionError ? (
        <p className="text-sm text-[var(--tg-theme-destructive-text-color)]" role="alert">
          {actionError}
        </p>
      ) : null}
    </div>
  );
}
