type UniversitySearchEventName =
  | 'university_search_no_results'
  | 'university_search_selected'
  | 'university_search_abandoned';

export type UniversitySearchEventPayload = {
  query: string;
  track?: string;
  selectedId?: string;
  resultCount: number;
  locale: string;
};

type PendingEvent = {
  name: UniversitySearchEventName;
  payload: UniversitySearchEventPayload;
};

const FLUSH_DELAY_MS = 2500;
let pendingEvents: PendingEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | undefined;

function flushEvents() {
  if (pendingEvents.length === 0) return;
  const batch = pendingEvents;
  pendingEvents = [];
  flushTimer = undefined;
  for (const event of batch) {
    // Structured for future Vercel Analytics / custom endpoint wiring.
    console.info('[analytics]', event.name, event.payload);
  }
}

export function trackUniversitySearchEvent(
  name: UniversitySearchEventName,
  payload: UniversitySearchEventPayload,
): void {
  pendingEvents.push({ name, payload });
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushEvents, FLUSH_DELAY_MS);
}

export function flushUniversitySearchAnalyticsForTests(): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushEvents();
}
