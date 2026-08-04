import type { AllocationConfidenceExplanation } from '../../shared/allocation-calculator';
import type { Messages } from '../i18n/types';

type ConfidenceMessages = Messages['dashboard']['allocation']['confidence'];

function formatCount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatAllocationConfidenceExplanation(
  messages: ConfidenceMessages,
  locale: string,
  explanation: AllocationConfidenceExplanation,
): string {
  switch (explanation.kind) {
    case 'small_sample':
      return messages.smallSample(
        formatCount(explanation.applications, locale),
        formatCount(explanation.countries, locale),
      );
    case 'insufficient_data':
      return messages.insufficientData;
    case 'low_volatile':
      return messages.lowVolatile(
        formatCount(explanation.applications, locale),
        formatCount(explanation.countries, locale),
      );
    case 'low_preliminary':
      return messages.lowPreliminary(
        formatCount(explanation.applications, locale),
        formatCount(explanation.countries, locale),
      );
    case 'medium':
      return messages.medium(
        formatCount(explanation.applications, locale),
        formatCount(explanation.countries, locale),
      );
    case 'high':
      return messages.high(
        formatCount(explanation.applications, locale),
        formatCount(explanation.countries, locale),
      );
  }
}
