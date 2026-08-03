import { productEventNames, productEventRequestSchema } from '../../shared/validation';
import { getTelegramInitData } from './telegram';

export type ProductEventName = (typeof productEventNames)[number];

export type UniversitySearchEventPayload = {
  query: string;
  track?: string;
  selectedId?: string;
  resultCount: number;
  locale: string;
};

type UniversitySearchEventName =
  | 'university_search_no_results'
  | 'university_search_selected'
  | 'university_search_abandoned';

type PendingSearchEvent = {
  name: UniversitySearchEventName;
  payload: UniversitySearchEventPayload;
};

const SEARCH_FLUSH_DELAY_MS = 2500;
let pendingSearchEvents: PendingSearchEvent[] = [];
let searchFlushTimer: ReturnType<typeof setTimeout> | undefined;

function flushSearchEvents() {
  if (pendingSearchEvents.length === 0) return;
  const batch = pendingSearchEvents;
  pendingSearchEvents = [];
  searchFlushTimer = undefined;
  for (const event of batch) {
    void trackProductEvent(event.name, event.payload);
  }
}

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

export function trackUniversitySearchEvent(
  name: UniversitySearchEventName,
  payload: UniversitySearchEventPayload,
): void {
  pendingSearchEvents.push({ name, payload });
  if (searchFlushTimer) clearTimeout(searchFlushTimer);
  searchFlushTimer = setTimeout(flushSearchEvents, SEARCH_FLUSH_DELAY_MS);
}
