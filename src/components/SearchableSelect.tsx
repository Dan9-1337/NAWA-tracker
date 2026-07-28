import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';

export type SearchableSelectOption = {
  value: string;
  label: string;
  group?: string;
  leading?: ReactNode;
};

type SearchableSelectProps = {
  id?: string;
  label: string;
  hint?: string;
  value: string;
  placeholder: string;
  searchPlaceholder: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  error?: string | null;
};

export function SearchableSelect({
  id,
  label,
  hint,
  value,
  placeholder,
  searchPlaceholder,
  options,
  onChange,
  error,
}: SearchableSelectProps) {
  const autoId = useId();
  const controlId = id ?? autoId;
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((option) => option.value === value);
  const selectedLabel = selected?.label ?? '';

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [options, query]);

  const grouped = useMemo(() => {
    const groups = new Map<string, SearchableSelectOption[]>();
    for (const option of filtered) {
      const key = option.group ?? '';
      const bucket = groups.get(key) ?? [];
      bucket.push(option);
      groups.set(key, bucket);
    }
    return groups;
  }, [filtered]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function openList() {
    setOpen(true);
    window.requestAnimationFrame(() => searchRef.current?.focus());
  }

  function selectOption(next: string) {
    onChange(next);
    setQuery('');
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="space-y-2 text-sm font-medium">
      <label htmlFor={controlId}>{label}</label>
      {hint ? <p className="text-xs font-normal text-[var(--tg-theme-subtitle-text-color)]">{hint}</p> : null}

      <button
        id={controlId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border bg-[var(--tg-theme-section-bg-color)] px-4 py-3 text-left text-base ${
          error
            ? 'border-[var(--tg-theme-destructive-text-color)]'
            : 'border-[var(--tg-theme-hint-color)]'
        }`}
        onClick={() => (open ? setOpen(false) : openList())}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
          {selected?.leading ? <span className="shrink-0">{selected.leading}</span> : null}
          <span
            className={`truncate ${
              selectedLabel ? 'text-[var(--tg-theme-text-color)]' : 'text-[var(--tg-theme-subtitle-text-color)]'
            }`}
          >
            {selectedLabel || placeholder}
          </span>
        </span>
        <span className="shrink-0 text-[var(--tg-theme-hint-color)]" aria-hidden="true">
          ▾
        </span>
      </button>

      {error ? (
        <p className="text-xs font-normal text-[var(--tg-theme-destructive-text-color)]" role="alert">
          {error}
        </p>
      ) : null}

      {open ? (
        <div className="rounded-2xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-section-bg-color)] shadow-lg">
          <div className="sticky top-0 z-10 border-b border-[var(--section-divider-color)] bg-[var(--tg-theme-section-bg-color)] p-2">
            <input
              ref={searchRef}
              type="search"
              aria-label={searchPlaceholder}
              placeholder={searchPlaceholder}
              className="min-h-11 w-full rounded-xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-bg-color)] px-3 py-2 text-base"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <ul id={listId} role="listbox" aria-label={label} className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-[var(--tg-theme-subtitle-text-color)]">{placeholder}</li>
            ) : (
              [...grouped.entries()].map(([groupName, groupOptions]) => (
                <li key={groupName || 'default'}>
                  {groupName ? (
                    <div className="px-4 pb-1 pt-2 text-xs font-semibold text-[var(--tg-theme-subtitle-text-color)]">
                      {groupName}
                    </div>
                  ) : null}
                  <ul>
                    {groupOptions.map((option) => {
                      const active = option.value === value;
                      return (
                        <li key={option.value}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={active}
                            className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition ${
                              active
                                ? 'bg-[var(--tg-theme-secondary-bg-color)] font-semibold text-[var(--tg-theme-text-color)]'
                                : 'text-[var(--tg-theme-text-color)] hover:bg-[color-mix(in_srgb,var(--tg-theme-hint-color)_12%,transparent)]'
                            }`}
                            onClick={() => selectOption(option.value)}
                          >
                            {option.leading ? <span className="shrink-0">{option.leading}</span> : null}
                            <span className="min-w-0 flex-1 truncate">{option.label}</span>
                            {active ? (
                              <span className="shrink-0 text-[var(--color-accent)]" aria-hidden="true">
                                ✓
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
