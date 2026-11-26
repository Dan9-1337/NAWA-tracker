import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { normalizeSearchText } from '../../shared/university-search/normalize';
import { useI18n } from '../i18n/context';
import { getTelegramWebApp } from '../lib/telegram';
import { holdBackButton } from '../lib/useMiniAppChrome';
import { CountryFlag } from './CountryFlag';
import { rankSearchMatches } from './rank-search-matches';

export type CountrySheetOption = {
  /** ISO 3166-1 alpha-2 code. */
  value: string;
  /** The name in the current app language. */
  label: string;
  /** The ISO code and the names in every app language, so a search works whatever the app language is. */
  aliases: readonly string[];
  popular: boolean;
};

type CountrySheetProps = {
  title: string;
  value: string;
  options: readonly CountrySheetOption[];
  onSelect: (value: string) => void;
  onClose: () => void;
  /** Gets the focus back when the sheet closes (Safari does not focus a button on tap, so `activeElement` is not enough). */
  returnFocusRef?: RefObject<HTMLElement>;
};

type Row = CountrySheetOption & { searchText: readonly string[] };

const FOCUSABLE = 'button:not([disabled]), input:not([disabled])';

export function CountrySheet({ title, value, options, onSelect, onClose, returnFocusRef }: CountrySheetProps) {
  const { t } = useI18n();
  const titleId = useId();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  const rows = useMemo<Row[]>(
    () =>
      options.map((option) => ({
        ...option,
        searchText: [option.label, ...option.aliases].map(normalizeSearchText),
      })),
    [options],
  );

  const normalizedQuery = normalizeSearchText(query);
  const searching = normalizedQuery.length > 0;

  const visible = useMemo<Row[]>(() => {
    if (!searching) return rows;
    const matches = rows.filter((row) => row.searchText.some((text) => text.includes(normalizedQuery)));
    // Ungrouped on purpose: while searching, the closest match comes first whichever group it belongs to.
    return rankSearchMatches(
      matches.map((row) => ({ ...row, group: undefined })),
      normalizedQuery,
    );
  }, [normalizedQuery, rows, searching]);

  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, rows.findIndex((row) => row.value === value)));
  const activeRow = visible[Math.min(activeIndex, visible.length - 1)];
  const activeValue = activeRow?.value;
  const optionId = (code: string) => `${listId}-${code}`;

  const callbacksRef = useRef({ onClose, onSelect, visible, activeValue });
  callbacksRef.current = { onClose, onSelect, visible, activeValue };

  function choose(code: string) {
    getTelegramWebApp()?.haptic.selection();
    callbacksRef.current.onSelect(code);
  }

  // Page behind: inert and not scrollable. Focus goes to the search field and comes back to the field that opened the sheet.
  useEffect(() => {
    const root = rootRef.current;
    const returnTo = returnFocusRef?.current ?? (document.activeElement as HTMLElement | null);
    const inerted: Element[] = [];
    for (const element of Array.from(document.body.children)) {
      if (element !== root && !element.hasAttribute('inert')) {
        element.setAttribute('inert', '');
        inerted.push(element);
      }
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    searchRef.current?.focus();

    return () => {
      for (const element of inerted) element.removeAttribute('inert');
      document.body.style.overflow = previousOverflow;
      returnTo?.focus?.();
    };
    // Runs once per open sheet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Telegram chrome: the main button is hidden and Back closes this sheet instead of the screen behind it.
  useEffect(() => {
    const app = getTelegramWebApp();
    const releaseBack = holdBackButton();
    const onBack = () => callbacksRef.current.onClose();
    app?.mainButton.hide();
    app?.backButton.onClick(onBack);
    return () => {
      app?.backButton.offClick(onBack);
      // The sheet is only used on the education step, where the main button is always visible.
      app?.mainButton.show();
      releaseBack();
    };
  }, []);

  // Keyboard: arrows move through the rows while focus stays in the search field, Enter chooses, Escape closes, Tab stays inside.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      const { onClose: close, visible: list, activeValue: current } = callbacksRef.current;
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (list.length === 0) return;
        const from = Math.max(0, list.findIndex((row) => row.value === current));
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setActiveIndex(Math.min(list.length - 1, Math.max(0, from + step)));
        return;
      }
      if (event.key === 'Enter' && event.target === searchRef.current) {
        event.preventDefault();
        if (current) choose(current);
        return;
      }
      if (event.key === 'Tab') {
        const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const inside = dialogRef.current?.contains(document.activeElement);
        if (!inside || (event.shiftKey && document.activeElement === first)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // `choose` only reads refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeValue) return;
    document.getElementById(optionId(activeValue))?.scrollIntoView?.({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeValue]);

  function renderRow(row: Row) {
    const chosen = row.value === value;
    const active = row.value === activeValue;
    return (
      <div
        key={row.value}
        id={optionId(row.value)}
        role="option"
        aria-selected={chosen}
        className={`flex min-h-11 cursor-pointer items-center gap-3 px-5 py-2.5 text-base ${
          active ? 'bg-[color-mix(in_srgb,var(--tg-theme-hint-color)_16%,transparent)]' : ''
        } ${chosen ? 'font-semibold' : ''} text-[var(--tg-theme-text-color)]`}
        // Keeps the focus in the search field while a row is pressed.
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => choose(row.value)}
      >
        <span className="shrink-0">
          <CountryFlag code={row.value} size={24} />
        </span>
        <span className="min-w-0 flex-1 truncate">{row.label}</span>
        {chosen ? (
          <span className="shrink-0 text-[var(--color-accent-ink)]" aria-hidden="true">
            ✓
          </span>
        ) : null}
      </div>
    );
  }

  // Groups only while browsing; search results are one list, closest match first.
  const popularRows = searching ? [] : visible.filter((row) => row.popular);
  const otherRows = searching ? visible : visible.filter((row) => !row.popular);

  function onSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    // The document listener handles the navigation keys; this only stops the search field from acting on them.
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') event.preventDefault();
  }

  return createPortal(
    <div ref={rootRef} className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-[var(--overlay-scrim)]" aria-hidden="true" onClick={onClose} />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-x-0 bottom-0 mx-auto flex h-[min(85vh,var(--tg-viewport-stable-height,100dvh))] w-full max-w-md flex-col rounded-t-3xl bg-[var(--tg-theme-section-bg-color)] shadow-2xl"
      >
        <div className="shrink-0 px-5 pt-3">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--tg-theme-hint-color)]" aria-hidden="true" />
          <div className="relative flex min-h-11 items-center justify-center">
            <h2 id={titleId} className="px-12 text-center text-lg font-semibold leading-tight">
              {title}
            </h2>
            <button
              type="button"
              className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-xl text-[var(--text-primary)]"
              onClick={onClose}
            >
              <span aria-hidden="true">×</span>
              <span className="sr-only">{t.countries.close}</span>
            </button>
          </div>
          <input
            ref={searchRef}
            type="search"
            aria-label={t.countries.searchPlaceholder}
            aria-controls={visible.length > 0 ? listId : undefined}
            aria-activedescendant={activeValue ? optionId(activeValue) : undefined}
            placeholder={t.countries.searchPlaceholder}
            autoComplete="off"
            className="mt-3 min-h-11 w-full rounded-xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-bg-color)] px-3 py-2 text-base"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onSearchKeyDown}
          />
        </div>

        <div
          className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain"
          style={{ paddingBottom: 'max(0.5rem, var(--tg-content-safe-area-inset-bottom, 0px))' }}
        >
          {visible.length === 0 ? (
            <p role="status" className="px-5 py-4 text-base text-[var(--tg-theme-subtitle-text-color)]">
              {t.countries.noResults}
            </p>
          ) : (
            <div id={listId} role="listbox" aria-label={title}>
              {popularRows.length > 0 ? (
                <div role="group" aria-label={t.countries.popular}>
                  <div
                    aria-hidden="true"
                    className="px-5 pb-1 pt-2 text-sm font-semibold text-[var(--tg-theme-subtitle-text-color)]"
                  >
                    {t.countries.popular}
                  </div>
                  {popularRows.map(renderRow)}
                </div>
              ) : null}
              {otherRows.map(renderRow)}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
