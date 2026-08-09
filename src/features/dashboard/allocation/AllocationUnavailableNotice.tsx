import { DashboardCard } from '../../../components/DashboardCard';
import { useI18n } from '../../../i18n/context';
import type { AllocationConfidenceExplanation } from '../../../../shared/allocation-calculator';
import { formatAllocationConfidenceExplanation } from '../../../lib/allocation-confidence-explanation';

type AllocationUnavailableNoticeProps = {
  explanation: AllocationConfidenceExplanation;
};

export function AllocationUnavailableNotice({ explanation }: AllocationUnavailableNoticeProps) {
  const { t, locale } = useI18n();

  return (
    <DashboardCard tone="muted" role="status">
      <p className="text-sm font-semibold text-[var(--text-primary)]">{t.dashboard.allocation.unavailableTitle}</p>
      <p className="text-sm leading-6 text-[var(--text-secondary)]">
        {formatAllocationConfidenceExplanation(t.dashboard.allocation.confidence, locale, explanation)}
      </p>
    </DashboardCard>
  );
}
