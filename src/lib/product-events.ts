import { productEventRequestSchema, type productEventNames } from '../../shared/validation';
import { getTelegramInitData } from './telegram';

export type ProductEventName = (typeof productEventNames)[number];

export type ProductEvent = { name: ProductEventName };

/** Fire-and-forget analytics. Events carry only their name; see `productEventRequestSchema`. */
export async function trackProductEvent(event: ProductEvent): Promise<void> {
  const initData = getTelegramInitData();
  if (!initData) return;

  const body = productEventRequestSchema.parse({ eventName: event.name });

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
