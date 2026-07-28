import { useEffect, useMemo, useRef, useState } from 'react';
import type { ResponseFormInput } from '../../shared/contracts';
import { MiniAppShell } from '../components/MiniAppShell';
import { SettingsSheet } from '../components/SettingsSheet';
import { TelegramGate } from '../components/TelegramGate';
import { CreateProfileFlow } from '../features/CreateProfileFlow';
import { ProfileDashboard } from '../features/ProfileDashboard';
import {
  statisticsStateFromResult,
  type StatisticsState,
} from '../features/statistics/StatisticsPanel';
import { useI18n } from '../i18n/context';
import {
  ApiClientError,
  createResponse,
  deleteResponse,
  getCurrentResponse,
  getStatistics,
  updateResponse,
} from '../lib/api-client';
import { clearStatsSnapshot } from '../lib/stats-snapshot';
import { clearWizardDraft } from '../lib/draft';
import { formatClockTime, formatShortDayTime, updatedStampKind } from '../lib/format';
import { getTelegramWebApp } from '../lib/telegram';
import { useMiniAppChrome } from '../lib/useMiniAppChrome';

type Mutation = 'create' | 'update' | 'delete';

type AuthenticatedState = {
  mode: 'authenticated';
  current: ResponseFormInput;
  statistics: StatisticsState;
  actionError: string | null;
  pending: 'update' | null;
};

type HomeState =
  | { mode: 'loading'; error: string | null }
  | { mode: 'gate' }
  | { mode: 'create'; pending: boolean; actionError?: string }
  | AuthenticatedState;

export function HomePage() {
  const { t, locale } = useI18n();
  const [state, setState] = useState<HomeState>(() =>
    getTelegramWebApp() ? { mode: 'loading', error: null } : { mode: 'gate' },
  );
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editRequestNonce, setEditRequestNonce] = useState(0);
  const [statsUpdatedAt, setStatsUpdatedAt] = useState<string | null>(null);
  const epoch = useRef(0);
  const mutation = useRef<Mutation | null>(null);
  const mounted = useRef(true);

  function beginEpoch() {
    epoch.current += 1;
    return epoch.current;
  }

  function isCurrent(id: number) {
    return mounted.current && epoch.current === id;
  }

  function acquireMutation(next: Mutation) {
    if (mutation.current) return false;
    mutation.current = next;
    return true;
  }

  function releaseMutation(active: Mutation) {
    if (mutation.current === active) mutation.current = null;
  }

  useEffect(() => {
    mounted.current = true;
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    if (getTelegramWebApp()) void loadCurrentSession();
    return () => {
      mounted.current = false;
      mutation.current = null;
      epoch.current += 1;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  async function loadStatistics(id: number) {
    try {
      const result = await getStatistics();
      if (!isCurrent(id)) return;
      setState((active) =>
        active.mode === 'authenticated'
          ? { ...active, statistics: statisticsStateFromResult(result) }
          : active,
      );
    } catch {
      if (!isCurrent(id)) return;
      setState((active) =>
        active.mode === 'authenticated' ? { ...active, statistics: { status: 'error' } } : active,
      );
    }
  }

  async function loadCurrentSession() {
    if (mutation.current) return;
    const id = beginEpoch();
    setState({ mode: 'loading', error: null });
    try {
      const current = await getCurrentResponse();
      if (!isCurrent(id)) return;
      setState({
        mode: 'authenticated',
        current: current.response,
        statistics: { status: 'loading' },
        actionError: null,
        pending: null,
      });
      void loadStatistics(id);
    } catch (error) {
      if (!isCurrent(id)) return;
      if (error instanceof ApiClientError && error.status === 401) {
        setState({ mode: 'create', pending: false });
      } else {
        setState({ mode: 'loading', error: t.home.loadError });
      }
    }
  }

  async function create(input: ResponseFormInput) {
    if (state.mode !== 'create' || state.pending || !acquireMutation('create')) return;
    const id = beginEpoch();
    setState({ mode: 'create', pending: true, actionError: undefined });
    try {
      const result = await createResponse({ response: input });
      if (!isCurrent(id)) return;
      setState({
        mode: 'authenticated',
        current: input,
        statistics: statisticsStateFromResult(result.statistics),
        actionError: null,
        pending: null,
      });
    } catch {
      if (isCurrent(id)) {
        setState({ mode: 'create', pending: false, actionError: t.form.saveError });
      }
      throw new Error('create failed');
    } finally {
      releaseMutation('create');
    }
  }

  async function update(input: ResponseFormInput) {
    if (state.mode !== 'authenticated' || state.pending || !acquireMutation('update')) return;
    const snapshot = state;
    const id = beginEpoch();
    setState({ ...snapshot, pending: 'update', actionError: null });
    try {
      const result = await updateResponse({ response: input });
      if (!isCurrent(id)) return;
      setState({
        mode: 'authenticated',
        current: input,
        statistics: statisticsStateFromResult(result.statistics),
        actionError: null,
        pending: null,
      });
    } catch (error) {
      if (isCurrent(id)) {
        const restartStatistics = snapshot.statistics.status === 'loading';
        const statisticsId = restartStatistics ? beginEpoch() : id;
        setState({ ...snapshot, pending: null, actionError: t.home.actionError });
        if (restartStatistics) void loadStatistics(statisticsId);
      }
      throw error;
    } finally {
      releaseMutation('update');
    }
  }

  async function removeProfile() {
    if (!acquireMutation('delete')) {
      throw new Error('delete in progress');
    }
    try {
      await deleteResponse();
      clearWizardDraft();
      clearStatsSnapshot();
      setSettingsOpen(false);
      setState({ mode: 'create', pending: false });
    } catch (error) {
      releaseMutation('delete');
      throw error;
    }
    releaseMutation('delete');
  }

  useMiniAppChrome(
    state.mode === 'loading' && state.error
      ? { main: { text: t.home.retry, visible: true, onClick: () => void loadCurrentSession() } }
      : {},
  );

  const statsSubtitle = useMemo(() => {
    if (!statsUpdatedAt || state.mode !== 'authenticated') return null;
    const kind = updatedStampKind(statsUpdatedAt);
    if (kind === 'today') return t.delta.updatedToday(formatClockTime(statsUpdatedAt, locale));
    if (kind === 'yesterday') return t.delta.updatedYesterday(formatClockTime(statsUpdatedAt, locale));
    return t.delta.updatedQuiet(formatShortDayTime(statsUpdatedAt, locale));
  }, [locale, state.mode, statsUpdatedAt, t.delta]);

  const content = (() => {
    if (state.mode === 'gate') {
      return <TelegramGate />;
    }

    if (state.mode === 'loading') {
      return (
        <section aria-busy={!state.error}>
          {state.error ? (
            <div role="alert" className="space-y-2">
              <p className="text-sm font-medium text-[var(--tg-theme-destructive-text-color)]">{state.error}</p>
              <p className="text-sm text-[var(--tg-theme-subtitle-text-color)]">{t.home.loadErrorHint}</p>
            </div>
          ) : (
            <p className="text-sm text-[var(--tg-theme-subtitle-text-color)]" role="status" aria-live="polite">
              {t.home.loading}
            </p>
          )}
        </section>
      );
    }

    if (state.mode === 'create') {
      return <CreateProfileFlow onSubmit={create} disabled={state.pending} actionError={state.actionError ?? null} />;
    }

    return (
      <ProfileDashboard
        current={state.current}
        statistics={state.statistics}
        onSubmit={update}
        onDelete={removeProfile}
        disabled={state.pending !== null}
        actionError={state.actionError}
        chromeSuspended={settingsOpen}
        editRequestNonce={editRequestNonce}
        onStatsUpdatedAt={setStatsUpdatedAt}
      />
    );
  })();

  return (
    <MiniAppShell
      title={t.app.title}
      subtitle={statsSubtitle}
      showLanguageSwitcher={state.mode === 'create' || state.mode === 'gate'}
      onOpenSettings={state.mode === 'authenticated' && !settingsOpen ? () => setSettingsOpen(true) : undefined}
      suspendActionBar={settingsOpen}
    >
      {offline ? (
        <p className="rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] px-4 py-3 text-sm" role="status">
          {t.home.offline}
        </p>
      ) : null}
      <div
        aria-hidden={settingsOpen}
        className={settingsOpen ? 'pointer-events-none space-y-4' : 'space-y-4'}
      >
        {content}
      </div>
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        current={state.mode === 'authenticated' ? state.current : null}
        onEditProfile={
          state.mode === 'authenticated'
            ? () => setEditRequestNonce((value) => value + 1)
            : undefined
        }
      />
    </MiniAppShell>
  );
}
