type RadioOptionProps = {
  name: string;
  value: string;
  checked: boolean;
  label: string;
  description?: string;
  /** Short sticker in the top-right corner of the card, for example a bonus. */
  badge?: string;
  onChange: (value: string) => void;
  onSelect?: () => void;
};

export function RadioOption({ name, value, checked, label, description, badge, onChange, onSelect }: RadioOptionProps) {
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
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-sm text-[var(--tg-theme-subtitle-text-color)]">{description}</span>
        ) : null}
      </span>
      {badge ? (
        <span className="shrink-0 self-start rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-xs font-semibold text-[#14161a]">
          {badge}
        </span>
      ) : null}
    </label>
  );
}

type RadioGroupProps<T extends string> = {
  name: string;
  value: T;
  options: Array<{ value: T; label: string; description?: string; badge?: string }>;
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
          badge={option.badge}
          onChange={(next) => onChange(next as T)}
          onSelect={onSelect}
        />
      ))}
    </fieldset>
  );
}
