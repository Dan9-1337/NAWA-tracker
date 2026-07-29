import { useI18n } from '../../../i18n/context';

type AllocationUnavailableNoticeProps = {
  explanation: string;
};

export function AllocationUnavailableNotice({ explanation }: AllocationUnavailableNoticeProps) {
  const { t } = useI18n();

  return (
    <div
      className="rounded-2xl border border-[var(--section-divider-color)] bg-[var(--tg-theme-secondary-bg-color)] px-3.5 py-3"
      role="status"
    >
      <p className="text-sm font-semibold text-[var(--text-primary)]">{t.dashboard.allocation.unavailableTitle}</p>
      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{explanation}</p>
    </div>
  );
}
