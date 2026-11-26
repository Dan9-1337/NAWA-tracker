import { useEffect, useMemo, useState } from 'react';
import type { ResponseFormInput } from '../../shared/contracts';
import { MiniAppShell } from '../components/MiniAppShell';
import { SettingsSheet } from '../components/SettingsSheet';
import { SkeletonBlock, SkeletonStatus } from '../components/Skeleton';
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
import { clearWizardDraft } from '../lib/draft';
import { formatClockTime, formatDate, formatShortDayTime, updatedStampKind } from '../lib/format';
import { getTelegramWebApp } from '../lib/telegram';
import { useMiniAppChrome } from '../lib/useMiniAppChrome';
import { useOnlineStatus } from '../lib/useOnlineStatus';
import { useRequestGuard } from '../lib/useRequestGuard';

type Mutation = 'create' | 'update' | 'delete';

/** Local calendar date (YYYY-MM-DD) of an instant, so `formatDate` does not shift it across the UTC boundary. */
function localIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

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

function LoadingState({ error }: { error: string | null }) {
  const { t } = useI18n();

  return (
    <section aria-busy={!error}>
      {error ? (
        <div role="alert" className="space-y-2">
          <p className="text-sm font-medium text-[var(--tg-theme-destructive-text-color)]">{error}</p>
          <p className="text-sm text-[var(--tg-theme-subtitle-text-color)]">{t.home.loadErrorHint}</p>
        </div>
      ) : (
        <SkeletonStatus label={t.home.loading} className="space-y-4">
          <SkeletonBlock className="mx-1 h-6 w-2/3" />
          <SkeletonBlock className="h-44 w-full rounded-2xl" />
        </SkeletonStatus>
      )}
    </section>
  );
}

export function HomePage() {
  const { t, locale } = useI18n();
  const [state, setState] = useState<HomeState>(() =>
    getTelegramWebApp() ? { mode: 'loading', error: null } : { mode: 'gate' },
  );
  const online = useOnlineStatus();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editRequestNonce, setEditRequestNonce] = useState(0);
  const [statsUpdatedAt, setStatsUpdatedAt] = useState<string | null>(null);
  const { begin: beginEpoch, isCurrent, acquire: acquireMutation, release: releaseMutation, isBusy } =
    useRequestGuard<Mutation>();

  /** A blocked score change explains when the next one is possible; every other failure keeps its generic copy. */
  function saveErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiClientError && error.code === 'EDIT_LIMIT_REACHED' && error.retryAt) {
      const retry = new Date(error.retryAt);
      if (!Number.isNaN(retry.getTime())) {
        if (updatedStampKind(error.retryAt) === 'today') {
          return t.form.editLimitToday(formatClockTime(error.retryAt, locale));
        }
        return t.form.editLimitDate(
          `${formatDate(localIsoDate(retry), locale)}, ${formatClockTime(error.retryAt, locale)}`,
        );
      }
    }
    return fallback;
  }

  useEffect(() => {
    if (getTelegramWebApp()) void loadCurrentSession();
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
    if (isBusy()) return;
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
    } catch (error) {
      if (isCurrent(id)) {
        setState({ mode: 'create', pending: false, actionError: saveErrorMessage(error, t.form.saveError) });
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
        setState({ ...snapshot, pending: null, actionError: saveErrorMessage(error, t.home.actionError) });
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
      setSettingsOpen(false);
      setState({ mode: 'create', pending: false });
    } finally {
      releaseMutation('delete');
    }
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
      return <LoadingState error={state.error} />;
    }

    if (state.mode === 'create') {
      return (
        <CreateProfileFlow
          onSubmit={create}
          disabled={state.pending}
          actionError={state.actionError ?? null}
          chromeSuspended={settingsOpen}
        />
      );
    }

    return (
      <ProfileDashboard
        current={state.current}
        statistics={state.statistics}
        onSubmit={update}
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
      onOpenSettings={
        !settingsOpen &&
        (state.mode === 'authenticated' || state.mode === 'create' || state.mode === 'gate')
          ? () => setSettingsOpen(true)
          : undefined
      }
      suspendActionBar={settingsOpen}
    >
      {!online ? (
        <p className="rounded-2xl bg-[var(--tg-theme-secondary-bg-color)] px-4 py-3 text-sm" role="status">
          {t.home.offline}
        </p>
      ) : null}
      <div
        aria-hidden={settingsOpen}
        className={
          settingsOpen ? 'pointer-events-none space-y-4' : 'space-y-4'
        }
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
        onDelete={state.mode === 'authenticated' ? removeProfile : undefined}
      />
    </MiniAppShell>
  );
}
