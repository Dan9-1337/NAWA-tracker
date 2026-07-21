import { useState } from 'react';
import { useI18n } from '../i18n/context';

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME?.trim() || 'nawa_tracker_bot';

type TelegramGateProps = {
  botUsername?: string;
};

export function TelegramGate({ botUsername = BOT_USERNAME }: TelegramGateProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const telegramUrl = `https://t.me/${botUsername.replace(/^@/, '')}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(telegramUrl)}`;

  async function copyBot() {
    try {
      await navigator.clipboard.writeText(`@${botUsername.replace(/^@/, '')}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-section-bg-color)] p-5">
      <h2 className="text-xl font-semibold">{t.telegram.gateTitle}</h2>
      <p className="mt-3 text-sm leading-7 text-[var(--tg-theme-subtitle-text-color)]">{t.telegram.gateBody}</p>

      <div className="mt-5 space-y-2">
        <a
          href={telegramUrl}
          className="flex min-h-11 items-center justify-center rounded-2xl bg-[var(--tg-theme-button-color)] px-4 py-3 text-sm font-semibold text-[var(--tg-theme-button-text-color)]"
        >
          {t.telegram.openInTelegram}
        </a>
        <button
          type="button"
          className="min-h-11 w-full rounded-2xl border border-[var(--tg-theme-hint-color)] px-4 py-3 text-sm font-semibold"
          onClick={() => void copyBot()}
        >
          {copied ? t.telegram.copied : t.telegram.copyBot}
        </button>
      </div>

      <img
        src={qrUrl}
        alt={t.telegram.qrAlt}
        className="mx-auto mt-5 h-44 w-44 rounded-2xl border border-[var(--tg-theme-hint-color)] bg-white p-2"
        loading="lazy"
      />
    </section>
  );
}
