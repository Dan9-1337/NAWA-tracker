import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ResponseFormInput } from '../../shared/contracts';
import { getSequentialStatusOptions } from '../../shared/status-options';
import { isSuspiciousStatusTransition } from '../../shared/status-transitions';
import { FormSection } from '../components/FormSection';
import { StatusTimeline } from '../components/StatusTimeline';
import { useI18n } from '../i18n/context';
import { saveWizardDraft, responseToDraft, type WizardDraft } from '../lib/draft';
import { getTelegramWebApp } from '../lib/telegram';
import { useMiniAppChrome } from '../lib/useMiniAppChrome';
import { ConfirmSummary } from './ConfirmSummary';
import {
  canAdvanceWizardStep,
  getWizardEffectiveSteps,
  ResponseWizardSteps,
  toResponseInput,
} from './ResponseWizardSteps';
import { StatisticsPanel, type StatisticsState } from './statistics/StatisticsPanel';

type View = 'dashboard' | 'edit-wizard' | 'edit-confirm';

type ProfileDashboardProps = {
  current: ResponseFormInput;
  statistics: StatisticsState;
  onSubmit: (value: ResponseFormInput) => void | Promise<void>;
  disabled?: boolean;
  actionError?: string | null;
};

export function ProfileDashboard({
  current,
  statistics,
  onSubmit,
  disabled = false,
  actionError,
}: ProfileDashboardProps) {
  const { t } = useI18n();
  const [view, setView] = useState<View>('dashboard');
  const [currentStatus, setCurrentStatus] = useState(current.currentStatus);
  const [statusChangedAt, setStatusChangedAt] = useState(current.statusChangedAt);
  const [editDraft, setEditDraft] = useState<WizardDraft>(() => responseToDraft(current));
  const [editStepIndex, setEditStepIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    setCurrentStatus(current.currentStatus);
    setStatusChangedAt(current.statusChangedAt);
    setEditDraft(responseToDraft(current));
  }, [current]);

  const statusOptions = useMemo(() => getSequentialStatusOptions(current.currentStatus), [current.currentStatus]);
  const suspicious = isSuspiciousStatusTransition(current.currentStatus, currentStatus);
  const statusDirty = currentStatus !== current.currentStatus || statusChangedAt !== current.statusChangedAt;

  const editEffectiveSteps = useMemo(() => getWizardEffectiveSteps(editDraft), [editDraft]);
  const editCurrentStep = editEffectiveSteps[Math.min(editStepIndex, editEffectiveSteps.length - 1)];

  const submitStatus = useCallback(async () => {
    if (disabled || inFlight.current || !statusDirty) return;
    inFlight.current = true;
    setPending(true);
    try {
      await onSubmit({ ...current, currentStatus, statusChangedAt });
      setSuccessMessage(t.form.savedSuccess);
      getTelegramWebApp()?.haptic.notification('success');
      window.setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      getTelegramWebApp()?.haptic.notification('error');
    } finally {
      setPending(false);
      inFlight.current = false;
    }
  }, [current, currentStatus, disabled, onSubmit, statusChangedAt, statusDirty, t.form.savedSuccess]);

  const submitEdit = useCallback(async () => {
    if (disabled || inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    try {
      await onSubmit(toResponseInput(editDraft));
      setView('dashboard');
      setSuccessMessage(t.form.savedSuccess);
      getTelegramWebApp()?.haptic.notification('success');
      window.setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      getTelegramWebApp()?.haptic.notification('error');
    } finally {
      setPending(false);
      inFlight.current = false;
    }
  }, [disabled, editDraft, onSubmit, t.form.savedSuccess]);

  useMiniAppChrome(
    view === 'dashboard'
      ? {
          main: {
            text: t.form.submitUpdate,
            visible: true,
            enabled: !disabled && statusDirty && !pending,
            loading: pending,
            onClick: submitStatus,
          },
          secondary: {
            text: t.form.editProfileAction,
            visible: true,
            enabled: !pending,
            onClick: () => {
              setEditDraft(responseToDraft(current));
              setEditStepIndex(0);
              setView('edit-wizard');
            },
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
              text: t.form.submitUpdate,
              visible: true,
              enabled: !disabled && !pending,
              loading: pending,
              onClick: submitEdit,
            },
            secondary: {
              text: t.wizard.editStep,
              visible: true,
              enabled: !pending,
              onClick: () => setView('edit-wizard'),
            },
            back: { visible: true, onClick: () => setView('edit-wizard') },
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
    return <ConfirmSummary draft={toResponseInput(editDraft)} />;
  }

  return (
    <div className="space-y-4">
      {successMessage ? (
        <p className="rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] px-4 py-3 text-sm" role="status">
          {successMessage}
        </p>
      ) : null}

      <FormSection title={t.wizard.statusTitle} description={t.wizard.statusDescription}>
        <StatusTimeline
          savedStatus={current.currentStatus}
          selectedStatus={currentStatus}
          options={statusOptions}
          onChange={setCurrentStatus}
        />
        <label className="space-y-2 text-sm font-medium">
          <span>{t.labels.statusChangedAt}</span>
          <input
            aria-label={t.labels.statusChangedAt}
            type="date"
            className="w-full rounded-2xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-section-bg-color)] px-4 py-3"
            value={statusChangedAt}
            onChange={(event) => setStatusChangedAt(event.target.value)}
          />
        </label>
        {suspicious ? (
          <p className="rounded-2xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-secondary-bg-color)] px-4 py-3 text-sm" role="alert">
            {t.form.suspiciousTransitionWarning}
          </p>
        ) : null}
      </FormSection>

      <StatisticsPanel state={statistics} />

      {actionError ? (
        <p className="text-sm text-[var(--tg-theme-destructive-text-color)]" role="alert">
          {actionError}
        </p>
      ) : null}
    </div>
  );
}
