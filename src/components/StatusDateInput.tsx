import { useState } from 'react';
import { useI18n } from '../i18n/context';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayIsoDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

type StatusDateInputProps = {
  value: string;
  onChange: (value: string) => void;
};

export function StatusDateInput({ value, onChange }: StatusDateInputProps) {
  const { t } = useI18n();
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{t.wizard.statusDateQuestion}</p>
      <div className="grid grid-cols-2 gap-2">
        {[
          { key: 'today', label: t.wizard.today, date: todayIsoDate() },
          { key: 'yesterday', label: t.wizard.yesterday, date: yesterdayIsoDate() },
        ].map((option) => (
          <button
            key={option.key}
            type="button"
            className={`min-h-11 rounded-2xl border px-3 py-2 text-sm font-medium ${
              value === option.date && !showPicker
                ? 'border-[var(--tg-theme-button-color)] bg-[var(--tg-theme-secondary-bg-color)]'
                : 'border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-section-bg-color)]'
            }`}
            onClick={() => {
              onChange(option.date);
              setShowPicker(false);
            }}
          >
            {option.label}
          </button>
        ))}
        <button
          type="button"
          className={`min-h-11 rounded-2xl border px-3 py-2 text-sm font-medium ${
            showPicker
              ? 'border-[var(--tg-theme-button-color)] bg-[var(--tg-theme-secondary-bg-color)]'
              : 'border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-section-bg-color)]'
          }`}
          onClick={() => setShowPicker(true)}
        >
          {t.wizard.pickDate}
        </button>
        <button
          type="button"
          className="min-h-11 rounded-2xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-section-bg-color)] px-3 py-2 text-sm font-medium"
          onClick={() => {
            onChange(todayIsoDate());
            setShowPicker(false);
          }}
        >
          {t.wizard.dontRemember}
        </button>
      </div>
      {showPicker ? (
        <input
          aria-label={t.labels.statusChangedAt}
          type="date"
          className="min-h-11 w-full rounded-2xl border border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-section-bg-color)] px-4 py-3 text-base"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : null}
    </div>
  );
}
