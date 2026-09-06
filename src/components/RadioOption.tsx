import type { ReactNode } from 'react';

type RadioOptionProps = {
  name: string;
  value: string;
  checked: boolean;
  label: string;
  description?: string;
  onChange: (value: string) => void;
  onSelect?: () => void;
};

export function RadioOption({ name, value, checked, label, description, onChange, onSelect }: RadioOptionProps) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition ${
        checked
          ? 'border-[var(--tg-theme-button-color)] bg-[var(--tg-theme-secondary-bg-color)]'
          : 'border-[var(--tg-theme-hint-color)] bg-[var(--tg-theme-section-bg-color)]'
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        className="mt-1"
        onChange={() => {
          onChange(value);
          onSelect?.();
        }}
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-[var(--tg-theme-subtitle-text-color)]">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

type RadioGroupProps<T extends string> = {
  name: string;
  value: T;
  options: Array<{ value: T; label: string; description?: string }>;
  onChange: (value: T) => void;
  onSelect?: () => void;
};

export function RadioGroup<T extends string>({ name, value, options, onChange, onSelect }: RadioGroupProps<T>) {
  return (
    <fieldset className="space-y-2">
      {options.map((option) => (
        <RadioOption
          key={option.value}
          name={name}
          value={option.value}
          checked={value === option.value}
          label={option.label}
          description={option.description}
          onChange={(next) => onChange(next as T)}
          onSelect={onSelect}
        />
      ))}
    </fieldset>
  );
}
