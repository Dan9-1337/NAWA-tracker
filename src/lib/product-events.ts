import type { ApplicationStatus } from '../../shared/contracts';
import { productEventRequestSchema, type plainProductEventNames } from '../../shared/validation';
import { getTelegramInitData } from './telegram';

export type PlainProductEventName = (typeof plainProductEventNames)[number];

export type ProductEvent =
  | { name: PlainProductEventName }
  | { name: 'status_updated'; from: ApplicationStatus; to: ApplicationStatus };

/** Fire-and-forget analytics. Events never carry free text; see `productEventRequestSchema`. */
export async function trackProductEvent(event: ProductEvent): Promise<void> {
  const initData = getTelegramInitData();
  if (!initData) return;

  const body = productEventRequestSchema.parse(
    event.name === 'status_updated'
      ? { eventName: event.name, payload: { from: event.from, to: event.to } }
      : { eventName: event.name },
  );

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
