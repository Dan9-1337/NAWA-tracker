import { useI18n } from '../../../i18n/context';
import type { AllocationConfidenceExplanation } from '../../../../shared/allocation-calculator';
import { formatAllocationConfidenceExplanation } from '../../../lib/allocation-confidence-explanation';

type AllocationUnavailableNoticeProps = {
  explanation: AllocationConfidenceExplanation;
};

export function AllocationUnavailableNotice({ explanation }: AllocationUnavailableNoticeProps) {
  const { t, locale } = useI18n();

  return (
    <div
      className="rounded-2xl border border-[var(--section-divider-color)] bg-[var(--tg-theme-secondary-bg-color)] px-3.5 py-3"
      role="status"
    >
      <p className="text-sm font-semibold text-[var(--text-primary)]">{t.dashboard.allocation.unavailableTitle}</p>
      <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
        {formatAllocationConfidenceExplanation(t.dashboard.allocation.confidence, locale, explanation)}
      </p>
    </div>
  );
}
