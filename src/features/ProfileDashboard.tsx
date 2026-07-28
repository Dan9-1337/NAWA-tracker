import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ResponseFormInput } from '../../shared/contracts';
import { calculateNawaOrientationScore } from '../../shared/nawa-score';
import { getSequentialStatusOptions } from '../../shared/status-options';
import { isSuspiciousStatusTransition } from '../../shared/status-transitions';
import { DeleteProfileZone } from '../components/DeleteProfileZone';
import { StatusDateInput } from '../components/StatusDateInput';
import { ChevronIcon } from '../components/icons';
import { StatusProgressStepper } from '../components/StatusProgressStepper';
import { StatusTimeline } from '../components/StatusTimeline';
import { useI18n } from '../i18n/context';
import { cohortFieldsChanged } from '../lib/cohort-fields';
import { formatDate } from '../lib/format';
import { saveWizardDraft, responseToDraft, type WizardDraft } from '../lib/draft';
import {
  loadStatsSnapshot,
  saveStatsSnapshot,
  snapshotFromStatistics,
  type StatsSnapshot,
} from '../lib/stats-snapshot';
import { getTelegramWebApp } from '../lib/telegram';
import { useMiniAppChrome } from '../lib/useMiniAppChrome';
import { ConfirmSummary } from './ConfirmSummary';
import {
  canAdvanceWizardStep,
  getWizardEffectiveSteps,
  ResponseWizardSteps,
  toResponseInput,
  wizardStepIndex,
  type WizardStep,
} from './ResponseWizardSteps';
import { StatisticsPanel, type StatisticsState } from './statistics/StatisticsPanel';

type View = 'dashboard' | 'edit-wizard' | 'edit-confirm';

type ProfileDashboardProps = {
  current: ResponseFormInput;
  statistics: StatisticsState;
  onSubmit: (value: ResponseFormInput) => void | Promise<void>;
  onDelete: () => Promise<void>;
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
  onDelete,
  disabled = false,
  actionError,
  chromeSuspended = false,
  editRequestNonce = 0,
  onStatsUpdatedAt,
}: ProfileDashboardProps) {
  const { t, locale } = useI18n();
  const [view, setView] = useState<View>('dashboard');
  const [currentStatus, setCurrentStatus] = useState(current.currentStatus);
  const [statusChangedAt, setStatusChangedAt] = useState(current.statusChangedAt);
  const [editDraft, setEditDraft] = useState<WizardDraft>(() => responseToDraft(current));
  const [editStepIndex, setEditStepIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [statusConfirmation, setStatusConfirmation] = useState(false);
  const [cohortWarning, setCohortWarning] = useState(false);
  const [statusEditorOpen, setStatusEditorOpen] = useState(false);
  const [previousSnapshot, setPreviousSnapshot] = useState<StatsSnapshot | null>(() => loadStatsSnapshot());
  const [statsUpdatedAt, setStatsUpdatedAt] = useState<string | null>(null);
  const inFlight = useRef(false);
  const lastProcessedStatisticsRef = useRef<unknown>(null);

  useEffect(() => {
    setCurrentStatus(current.currentStatus);
    setStatusChangedAt(current.statusChangedAt);
    setEditDraft(responseToDraft(current));
  }, [current]);

  useEffect(() => {
    if (statistics.status !== 'success' && statistics.status !== 'suppressed') return;
    // Guard against reprocessing the same payload (e.g. React StrictMode's double effect
    // invocation), which would otherwise compare a freshly saved snapshot against itself
    // and report "no changes" on a user's very first visit.
    if (lastProcessedStatisticsRef.current === statistics.data) return;
    lastProcessedStatisticsRef.current = statistics.data;

    const snapshot = snapshotFromStatistics(statistics.data);
    const previous = loadStatsSnapshot();
    setPreviousSnapshot(previous);
    setStatsUpdatedAt(snapshot.fetchedAt);
    saveStatsSnapshot(snapshot);
  }, [statistics]);

  useEffect(() => {
    onStatsUpdatedAt?.(statsUpdatedAt);
  }, [onStatsUpdatedAt, statsUpdatedAt]);

  useEffect(() => {
    if (!statusConfirmation) return undefined;
    const id = window.setTimeout(() => setStatusConfirmation(false), 3500);
    return () => window.clearTimeout(id);
  }, [statusConfirmation]);

  const statusOptions = useMemo(() => getSequentialStatusOptions(current.currentStatus), [current.currentStatus]);
  const suspicious = isSuspiciousStatusTransition(current.currentStatus, currentStatus);
  const statusDirty = currentStatus !== current.currentStatus || statusChangedAt !== current.statusChangedAt;

  const userOrientationScore = useMemo(() => {
    if (current.scholarshipTrack !== 'nawa_director') return null;
    return calculateNawaOrientationScore(
      current.averageGrade,
      current.maximumGrade,
      current.polishSchoolLevel ?? 'none',
    );
  }, [current]);

  const editEffectiveSteps = useMemo(() => getWizardEffectiveSteps(), []);
  const editCurrentStep = editEffectiveSteps[Math.min(editStepIndex, editEffectiveSteps.length - 1)];

  const submitStatus = useCallback(async () => {
    if (disabled || inFlight.current || !statusDirty) return;
    inFlight.current = true;
    setPending(true);
    try {
      await onSubmit({ ...current, currentStatus, statusChangedAt });
      setStatusConfirmation(true);
      setStatusEditorOpen(false);
      getTelegramWebApp()?.haptic.notification('success');
    } catch {
      getTelegramWebApp()?.haptic.notification('error');
    } finally {
      setPending(false);
      inFlight.current = false;
    }
  }, [current, currentStatus, disabled, onSubmit, statusChangedAt, statusDirty]);

  const submitEdit = useCallback(async () => {
    if (disabled || inFlight.current) return;
    const next = toResponseInput(editDraft);
    const changedCohort = cohortFieldsChanged(current, next);
    if (changedCohort.length > 0 && !cohortWarning) {
      setCohortWarning(true);
      return;
    }

    inFlight.current = true;
    setPending(true);
    try {
      await onSubmit(next);
      setView('dashboard');
      setCohortWarning(false);
      setStatusConfirmation(true);
      getTelegramWebApp()?.haptic.notification('success');
    } catch {
      getTelegramWebApp()?.haptic.notification('error');
    } finally {
      setPending(false);
      inFlight.current = false;
    }
  }, [cohortWarning, current, disabled, editDraft, onSubmit]);

  const jumpToEditSection = useCallback((section: WizardStep) => {
    setView('edit-wizard');
    setEditStepIndex(wizardStepIndex(section));
  }, []);

  const startEdit = useCallback(() => {
    setEditDraft(responseToDraft(current));
    setEditStepIndex(0);
    setCohortWarning(false);
    setView('edit-wizard');
  }, [current]);

  useEffect(() => {
    if (editRequestNonce > 0) startEdit();
  }, [editRequestNonce, startEdit]);

  const cancelCohortWarning = useCallback(() => {
    setCohortWarning(false);
  }, []);

  useMiniAppChrome(
    chromeSuspended
      ? {}
      : view === 'dashboard'
      ? {
          main: {
            text: t.form.submitUpdate,
            visible: statusDirty,
            enabled: !disabled && statusDirty && !pending,
            loading: pending,
            onClick: submitStatus,
          },
          closingConfirmation: statusDirty,
        }
      : view === 'edit-wizard'
        ? {
            main: {
              text: t.wizard.next,
              visible: true,
              enabled: !disabled && canAdvanceWizardStep(editCurrentStep, editDraft),
              onClick: () => {
                if (editStepIndex >= editEffectiveSteps.length - 1) {
                  setView('edit-confirm');
                  return;
                }
                setEditStepIndex((index) => Math.min(index + 1, editEffectiveSteps.length - 1));
              },
            },
            back: {
              visible: true,
              onClick: () => {
                if (editStepIndex <= 0) {
                  setView('dashboard');
                  return;
                }
                setEditStepIndex((index) => Math.max(index - 1, 0));
              },
            },
            closingConfirmation: true,
          }
        : {
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
              onClick: () => {
                if (cohortWarning) {
                  cancelCohortWarning();
                  return;
                }
                setView('edit-wizard');
              },
            },
            back: {
              visible: true,
              onClick: () => {
                if (cohortWarning) {
                  cancelCohortWarning();
                  return;
                }
                setView('edit-wizard');
              },
            },
            closingConfirmation: true,
          },
  );

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
        <DeleteProfileZone onDelete={onDelete} disabled={disabled || pending} />
      </>
    );
  }

  return (
    <div className="space-y-3">
      {statusConfirmation ? (
        <p className="text-sm text-[var(--tg-theme-success-text-color)]" role="status" aria-live="polite">
          ✓ {t.form.statusSaved}
        </p>
      ) : null}

      <StatisticsPanel
        state={statistics}
        profile={current}
        userScore={userOrientationScore}
        previousSnapshot={previousSnapshot}
      />

      {!statusEditorOpen ? (
        <button
          type="button"
          className="mt-6 flex w-full flex-col gap-0 rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] px-3.5 py-3 text-left transition-opacity hover:opacity-90 active:opacity-70"
          onClick={() => setStatusEditorOpen(true)}
        >
          <span className="flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-xs font-medium uppercase tracking-[0.08em] text-[var(--tg-theme-subtitle-text-color)]">
                {t.labels.currentStatus}
              </span>
              <span className="mt-1 block text-sm font-semibold leading-snug">{t.choices.currentStatus[currentStatus]}</span>
              <span className="mt-0.5 block text-xs text-[var(--tg-theme-subtitle-text-color)]">
                {t.form.statusUpdatedShort} {formatDate(statusChangedAt, locale)}
              </span>
            </span>
            <span className="disclosure-row__chevron">
              <ChevronIcon />
            </span>
          </span>
          <StatusProgressStepper status={currentStatus} />
        </button>
      ) : (
        <section className="mt-6 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--tg-theme-subtitle-text-color)]">
              {t.labels.currentStatus}
            </h2>
            {!statusDirty ? (
              <button
                type="button"
                className="min-h-11 text-sm font-medium text-[var(--tg-theme-link-color)]"
                onClick={() => setStatusEditorOpen(false)}
              >
                {t.form.collapseStatus}
              </button>
            ) : null}
          </div>
          <p className="text-sm text-[var(--tg-theme-subtitle-text-color)]">{t.wizard.statusDescription}</p>
          <StatusTimeline
            savedStatus={current.currentStatus}
            selectedStatus={currentStatus}
            options={statusOptions}
            onChange={(status) => {
              setStatusConfirmation(false);
              setCurrentStatus(status);
            }}
            showHints
          />
          <StatusDateInput
            value={statusChangedAt}
            onChange={(value) => {
              setStatusConfirmation(false);
              setStatusChangedAt(value);
            }}
          />
          {suspicious ? (
            <p className="text-sm text-[var(--tg-theme-subtitle-text-color)]" role="alert">
              {t.form.suspiciousTransitionWarning}
            </p>
          ) : null}
        </section>
      )}

      {actionError ? (
        <p className="text-sm text-[var(--tg-theme-destructive-text-color)]" role="alert">
          {actionError}
        </p>
      ) : null}
    </div>
  );
}
