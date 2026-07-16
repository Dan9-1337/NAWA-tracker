import { useEffect, useRef } from 'react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useI18n } from '../i18n/context';

type TurnstileWidgetProps = {
  siteKey?: string;
  onVerify?: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  resetKey?: number;
};

export function TurnstileWidget({
  siteKey,
  onVerify,
  onExpire,
  onError,
  resetKey = 0,
}: TurnstileWidgetProps) {
  const { t } = useI18n();
  const widget = useRef<TurnstileInstance>();
  const previousResetKey = useRef(resetKey);

  useEffect(() => {
    if (previousResetKey.current !== resetKey) {
      previousResetKey.current = resetKey;
      widget.current?.reset();
    }
  }, [resetKey]);

  if (!siteKey) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        {t.turnstile.disabled}
      </div>
    );
  }

  return (
    <Turnstile
      ref={widget}
      siteKey={siteKey}
      onSuccess={onVerify}
      onExpire={() => {
        widget.current?.reset();
        onExpire?.();
      }}
      onError={() => {
        widget.current?.reset();
        onError?.();
      }}
    />
  );
}
