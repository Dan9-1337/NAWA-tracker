import { useMemo, useState } from 'react';
import { generate } from 'lean-qr';
import { toSvgPath } from 'lean-qr/extras/svg';
import { useI18n } from '../i18n/context';

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME?.trim() || 'nawa_tracker_bot';

type TelegramGateProps = {
  botUsername?: string;
};

export function TelegramGate({ botUsername = BOT_USERNAME }: TelegramGateProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const telegramUrl = `https://t.me/${botUsername.replace(/^@/, '')}`;
  const qr = useMemo(() => {
    const code = generate(telegramUrl);
    return { size: code.size, path: toSvgPath(code) };
  }, [telegramUrl]);
  // Four-module quiet zone around the code, as the QR specification asks.
  const quietZone = 4;
  const viewBoxSize = qr.size + quietZone * 2;

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

      <svg
        role="img"
        aria-label={t.telegram.qrAlt}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`${-quietZone} ${-quietZone} ${viewBoxSize} ${viewBoxSize}`}
        width={180}
        height={180}
        shapeRendering="crispEdges"
        className="mx-auto mt-5 rounded-2xl border border-[var(--tg-theme-hint-color)]"
      >
        <rect x={-quietZone} y={-quietZone} width={viewBoxSize} height={viewBoxSize} fill="#ffffff" />
        <path d={qr.path} fill="#000000" />
      </svg>
    </section>
  );
}
