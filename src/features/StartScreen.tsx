import { useEffect, useRef, useState, type Ref } from 'react';
import { HowItWorksPanel } from '../components/HowItWorksPanel';
import { ChevronIcon } from '../components/icons';
import { ResultPreviewCard } from '../components/ResultPreviewCard';
import { useI18n } from '../i18n/context';
import { getIntakeSummary } from '../lib/api-client';
import { trackProductEvent } from '../lib/product-events';

type FaqId = 'how' | 'what';

function FaqRow({
  title,
  open,
  onToggle,
  separated = false,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  separated?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <button
        type="button"
        className={`flex w-full min-h-11 items-center justify-between gap-3 px-4 py-3 text-left${
          separated ? ' border-t border-[var(--section-divider-color)]' : ''
        }`}
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="text-sm font-medium text-[var(--text-primary)]">{title}</span>
        <span className={`shrink-0 text-[var(--tg-theme-hint-color)] transition-transform ${open ? 'rotate-90' : ''}`}>
          <ChevronIcon />
        </span>
      </button>
      {open ? children : null}
    </>
  );
}

type StartScreenProps = {
  disabled: boolean;
  showResumePrompt: boolean;
  startCtaRef: Ref<HTMLButtonElement>;
  onStart: () => void;
  onContinue: () => void;
  onStartOver: () => void;
};

/** Landing screen: pitch, sample result, start button, optional "resume your draft" prompt and the FAQ. */
export function StartScreen({
  disabled,
  showResumePrompt,
  startCtaRef,
  onStart,
  onContinue,
  onStartOver,
}: StartScreenProps) {
  const { t } = useI18n();
  const [openFaq, setOpenFaq] = useState<FaqId | null>(null);
  const [intakeSummary, setIntakeSummary] = useState<{ count: number; year: number } | null>(null);
  const landingTracked = useRef(false);
  const toggle = (id: FaqId) => setOpenFaq((value) => (value === id ? null : id));

  // The start screen only exists in create mode. Guarded with a ref because StrictMode runs effects twice in development.
  useEffect(() => {
    if (landingTracked.current) return;
    landingTracked.current = true;
    void trackProductEvent({ name: 'landing_viewed' });
  }, []);

  // One request when the screen mounts. A pending or failed request renders nothing: the start button stays usable.
  useEffect(() => {
    let mounted = true;
    getIntakeSummary()
      .then((summary) => {
        if (mounted && summary.responseCount !== null) {
          setIntakeSummary({ count: summary.responseCount, year: summary.intakeYear });
        }
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="space-y-4">
      {showResumePrompt ? (
        <div className="rounded-2xl border border-[var(--tg-theme-button-color)] bg-[var(--tg-theme-secondary-bg-color)] px-4 py-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{t.start.resumeTitle}</p>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{t.start.resumeBody}</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="min-h-11 rounded-2xl bg-[var(--tg-theme-button-color)] px-4 py-3 text-sm font-semibold text-[var(--tg-theme-button-text-color)]"
              onClick={onContinue}
            >
              {t.start.resumeContinue}
            </button>
            <button
              type="button"
              className="min-h-11 rounded-2xl border border-[var(--tg-theme-hint-color)] px-4 py-3 text-sm font-semibold"
              onClick={onStartOver}
            >
              {t.start.resumeStartOver}
            </button>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-helper)]">
          {t.start.kicker}{' '}
          <span className="text-[0.625rem] font-medium normal-case tracking-normal opacity-80">
            ({t.start.kickerNote})
          </span>
        </p>
        <h2 className="text-[1.75rem] font-bold leading-[1.15] tracking-tight text-[var(--text-primary)]">
          {t.start.title}
        </h2>
        <p className="text-sm leading-6 text-[var(--text-secondary)]">{t.start.subtitle}</p>
      </div>

      <ResultPreviewCard />

      {intakeSummary ? (
        <p
          className="text-center text-xs font-medium text-[var(--text-secondary)]"
          data-testid="intake-response-count"
        >
          <span className="text-[var(--color-accent-ink)]" aria-hidden="true">
            ●
          </span>{' '}
          {t.start.responseCount(intakeSummary.count, intakeSummary.year)}
        </p>
      ) : null}

      <button
        ref={startCtaRef}
        type="button"
        disabled={disabled}
        className="min-h-12 w-full rounded-2xl bg-[var(--tg-theme-button-color)] px-4 py-3 text-base font-semibold text-[var(--tg-theme-button-text-color)] disabled:opacity-60"
        onClick={onStart}
      >
        {t.start.cta}
      </button>
      <p className="text-center text-xs font-medium text-[var(--text-helper)]">{t.start.timePromise}</p>

      <div className="overflow-hidden rounded-2xl border border-[var(--section-divider-color)]">
        <FaqRow title={t.start.whatYouSee} open={openFaq === 'what'} onToggle={() => toggle('what')}>
          <p className="border-t border-[var(--section-divider-color)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
            {t.start.whatYouSeeBody}
          </p>
        </FaqRow>
        <FaqRow title={t.start.howItWorks} open={openFaq === 'how'} onToggle={() => toggle('how')} separated>
          <HowItWorksPanel />
        </FaqRow>
      </div>
    </section>
  );
}
