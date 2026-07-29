import { productEventRequestSchema } from '../../shared/validation';
import { getTelegramInitData } from './telegram';

export type ProductEventName =
  | 'wizard_started'
  | 'wizard_completed'
  | 'score_viewed'
  | 'position_or_fallback_viewed'
  | 'status_updated'
  | 'dashboard_revisit';

export async function trackProductEvent(
  eventName: ProductEventName,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const initData = getTelegramInitData();
  if (!initData) return;

  const body = productEventRequestSchema.parse({ eventName, payload });

  try {
    await fetch('/api/product-events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `tma ${initData}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    // Analytics must never block the UI.
  }
}
