import { useEffect, useRef, useState } from 'react';
import type { RecoveryCredential, ResponseFormInput } from '../../shared/contracts';
import { useI18n } from '../i18n/context';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { RecoveryCard } from '../features/recovery/RecoveryCard';
import { RestoreAccess } from '../features/recovery/RestoreAccess';
import { CreateResponseWizard } from '../features/response-wizard/CreateResponseWizard';
import { EditProfileForm } from '../features/response-form/EditProfileForm';
import { UpdateApplicationStatusForm } from '../features/response-form/UpdateApplicationStatusForm';
import {
  StatisticsPanel,
  statisticsStateFromResult,
  type StatisticsState,
} from '../features/statistics/StatisticsPanel';
import {
  ApiClientError,
  createResponse,
  getCurrentResponse,
  getStatistics,
  logoutSession,
  rotateRecovery,
  updateResponse,
} from '../lib/api-client';

type Mutation = 'create' | 'update' | 'rotate' | 'logout' | 'reconcile';

type AuthenticatedState = {
  mode: 'authenticated';
  current: ResponseFormInput;
  statistics: StatisticsState;
  actionError: string | null;
  pending: 'update' | 'rotate' | null;
  editingProfile: boolean;
};

type HomeState =
  | { mode: 'loading'; reason: 'startup' | 'logout'; error: string | null }
  | { mode: 'create'; pending: boolean; actionError?: string }
  | { mode: 'restore'; recoveryToken: string | null }
  | {
      mode: 'recovery';
      current: ResponseFormInput;
      statistics: StatisticsState;
      credential: RecoveryCredential;
      rotated: boolean;
    }
  | AuthenticatedState;

type HomePageProps = {
  initialRecoveryToken: string | null;
};

export function HomePage({ initialRecoveryToken }: HomePageProps) {
  const { t } = useI18n();
  const [state, setState] = useState<HomeState>(() =>
    initialRecoveryToken
      ? { mode: 'restore', recoveryToken: initialRecoveryToken }
      : { mode: 'loading', reason: 'startup', error: null },
  );
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
        active.mode === 'authenticated'
          ? { ...active, statistics: { status: 'error' } }
          : active,
      );
    }
  }

  async function loadCurrentSession() {
    if (mutation.current) return;
    const id = beginEpoch();
    setState({ mode: 'loading', reason: 'startup', error: null });
    try {
      const current = await getCurrentResponse();
      if (!isCurrent(id)) return;
      setState({
        mode: 'authenticated',
        current: current.response,
        statistics: { status: 'loading' },
        actionError: null,
        pending: null,
        editingProfile: false,
      });
      void loadStatistics(id);
    } catch (error) {
      if (!isCurrent(id)) return;
      if (error instanceof ApiClientError && error.status === 401) {
        setState({ mode: 'create', pending: false });
      } else {
        setState({ mode: 'loading', reason: 'startup', error: t.home.loadError });
      }
    }
  }

  async function reconcileCurrentSession(onUnauthorized: 'restore' | 'create') {
    if (!acquireMutation('reconcile')) return;
    const id = beginEpoch();
    if (onUnauthorized === 'create') {
      setState({ mode: 'loading', reason: 'startup', error: null });
    }
    try {
      const current = await getCurrentResponse();
      if (!isCurrent(id)) return;
      setState({
        mode: 'authenticated',
        current: current.response,
        statistics: { status: 'loading' },
        actionError: null,
        pending: null,
        editingProfile: false,
      });
      void loadStatistics(id);
    } catch (error) {
      if (!isCurrent(id)) return;
      if (error instanceof ApiClientError && error.status === 401) {
        if (onUnauthorized === 'create') setState({ mode: 'create', pending: false });
      } else {
        setState({ mode: 'loading', reason: 'startup', error: t.home.loadError });
      }
    } finally {
      releaseMutation('reconcile');
    }
  }

  useEffect(() => {
    mounted.current = true;
    if (!initialRecoveryToken) void loadCurrentSession();
    return () => {
      mounted.current = false;
      mutation.current = null;
      epoch.current += 1;
    };
  }, [initialRecoveryToken]);

  async function create(input: ResponseFormInput, turnstileToken: string) {
    if (state.mode !== 'create' || !acquireMutation('create')) return;
    const id = beginEpoch();
    setState({ mode: 'create', pending: true });
    try {
      const result = await createResponse({ response: input, turnstileToken });
      if (!isCurrent(id)) return;
      releaseMutation('create');
      setState({
        mode: 'recovery',
        current: input,
        statistics: statisticsStateFromResult(result.statistics),
        credential: {
          recoveryToken: result.recoveryToken,
          recoveryUrl: result.recoveryUrl,
        },
        rotated: false,
      });
    } catch (error) {
      if (isCurrent(id)) setState({ mode: 'create', pending: false });
      throw error;
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
        editingProfile: false,
      });
    } catch (error) {
      if (isCurrent(id)) {
        const restartStatistics = snapshot.statistics.status === 'loading';
        const statisticsId = restartStatistics ? beginEpoch() : id;
        setState({ ...snapshot, pending: null });
        if (restartStatistics) void loadStatistics(statisticsId);
      }
      throw error;
    } finally {
      releaseMutation('update');
    }
  }

  function restored(result: { response: ResponseFormInput }) {
    if (mutation.current) return;
    const id = beginEpoch();
    setState({
      mode: 'authenticated',
      current: result.response,
      statistics: { status: 'loading' },
      actionError: null,
      pending: null,
      editingProfile: false,
    });
    void loadStatistics(id);
  }

  async function rotate() {
    if (state.mode !== 'authenticated' || state.pending || !acquireMutation('rotate')) return;
    const snapshot = state;
    const id = beginEpoch();
    setState({ ...snapshot, pending: 'rotate', actionError: null });
    try {
      const credential = await rotateRecovery();
      if (!isCurrent(id)) return;
      releaseMutation('rotate');
      setState({
        mode: 'recovery',
        current: snapshot.current,
        statistics: snapshot.statistics,
        credential,
        rotated: true,
      });
    } catch {
      if (isCurrent(id)) {
        const restartStatistics = snapshot.statistics.status === 'loading';
        const statisticsId = restartStatistics ? beginEpoch() : id;
        setState({ ...snapshot, actionError: t.home.actionError, pending: null });
        if (restartStatistics) void loadStatistics(statisticsId);
      }
    } finally {
      releaseMutation('rotate');
    }
  }

  async function logout() {
    if (state.mode !== 'authenticated' || state.pending || !acquireMutation('logout')) return;
    const id = beginEpoch();
    setState({ mode: 'loading', reason: 'logout', error: null });
    try {
      await logoutSession();
      if (!isCurrent(id)) return;
      releaseMutation('logout');
      setState({ mode: 'create', pending: false });
    } catch {
      if (!isCurrent(id)) return;
      releaseMutation('logout');
      setState({ mode: 'loading', reason: 'logout', error: t.home.logoutError });
    } finally {
      releaseMutation('logout');
    }
  }

  function confirmRecovery() {
    if (state.mode !== 'recovery') return;
    const current = state.current;
    const needsStatistics = state.statistics.status === 'loading';
    const id = beginEpoch();
    setState({
      mode: 'authenticated',
      current,
      statistics: state.statistics,
      actionError: null,
      pending: null,
      editingProfile: false,
    });
    if (needsStatistics) void loadStatistics(id);
  }

  function setEditingProfile(editingProfile: boolean) {
    setState((active) => (active.mode === 'authenticated' ? { ...active, editingProfile } : active));
  }

  const content = (() => {
    if (state.mode === 'loading') {
      const message = state.reason === 'logout' ? t.home.loggingOut : t.home.loading;
      return (
        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]" aria-busy={!state.error}>
          {state.error ? (
            <>
              <p className="text-sm text-rose-900" role="alert">{state.error}</p>
              <button type="button" className="mt-4 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white" onClick={() => void loadCurrentSession()}>
                {t.home.retry}
              </button>
            </>
          ) : (
            <p className="text-sm text-slate-600" role="status" aria-live="polite">{message}</p>
          )}
        </section>
      );
    }

    if (state.mode === 'restore') {
      return (
        <RestoreAccess
          initialRecoveryToken={state.recoveryToken}
          onRecoveryTokenConsumed={() => {
            setState((active) => active.mode === 'restore' ? { ...active, recoveryToken: null } : active);
          }}
          onRestored={restored}
          onRestoreFailed={() => reconcileCurrentSession('restore')}
          onCancel={() => reconcileCurrentSession('create')}
          siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
        />
      );
    }

    if (state.mode === 'recovery') {
      return <RecoveryCard credential={state.credential} rotated={state.rotated} onConfirm={confirmRecovery} />;
    }

    if (state.mode === 'create') {
      return (
        <>
          <CreateResponseWizard
            key="create"
            onSubmit={create}
            disabled={state.pending}
            siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
          />
          {state.actionError ? <p className="text-sm text-rose-900" role="alert">{state.actionError}</p> : null}
          {!state.pending ? (
            <button type="button" className="text-sm font-semibold text-sky-700" onClick={() => {
              if (mutation.current) return;
              beginEpoch();
              setState({ mode: 'restore', recoveryToken: null });
            }}>
              {t.home.restoreAccess}
            </button>
          ) : null}
        </>
      );
    }

    const busy = state.pending !== null;
    return (
      <>
        {state.editingProfile ? (
          <EditProfileForm
            key="edit-profile"
            initialValue={state.current}
            onSubmit={update}
            onCancel={() => setEditingProfile(false)}
            disabled={busy}
          />
        ) : (
          <UpdateApplicationStatusForm
            key="update-status"
            initialValue={state.current}
            onSubmit={update}
            onRequestEditProfile={() => setEditingProfile(true)}
            disabled={busy}
          />
        )}
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_10px_40px_rgba(15,23,42,0.06)]" aria-busy={busy}>
          <h2 className="text-lg font-semibold text-slate-900">{t.home.accessTitle}</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50" disabled={busy} onClick={() => void rotate()}>
              {state.pending === 'rotate' ? t.recovery.rotating : t.recovery.rotate}
            </button>
            <button type="button" className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={busy} onClick={() => void logout()}>
              {t.recovery.logout}
            </button>
          </div>
          {state.pending === 'rotate' ? <p className="mt-4 text-sm text-slate-600" role="status" aria-live="polite">{t.recovery.rotating}</p> : null}
          {state.actionError ? <p className="mt-4 text-sm text-rose-900" role="alert">{state.actionError}</p> : null}
        </section>
      </>
    );
  })();

  const statistics: StatisticsState | null = (() => {
    if (state.mode === 'authenticated' || state.mode === 'recovery') return state.statistics;
    if (state.mode === 'create') return { status: 'unavailable' };
    if (state.mode === 'loading' && state.reason === 'startup' && !state.error) return { status: 'loading' };
    return null;
  })();

  return (
    <main className="min-h-screen px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 pb-10">
        <header className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/85 px-6 py-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:px-8 lg:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">{t.app.eyebrow}</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">{t.app.title}</h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">{t.app.subtitle}</p>
              <span className="mt-5 inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white">{t.app.status}</span>
            </div>
            <LanguageSwitcher />
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
              <h2 className="text-2xl font-semibold text-slate-950">{t.home.headline}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">{t.home.intro}</p>
            </div>
            {content}
          </section>

          <aside className="space-y-6">
            {statistics ? <StatisticsPanel state={statistics} /> : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
