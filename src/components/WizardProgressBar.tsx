type WizardProgressBarProps = {
  current: number;
  total: number;
};

export function WizardProgressBar({ current, total }: WizardProgressBarProps) {
  return (
    <div
      className="flex gap-1"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`${current} / ${total}`}
    >
      {Array.from({ length: total }, (_, index) => {
        const filled = index < current;
        return (
          <div
            key={index}
            className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--tg-theme-hint-color)]"
          >
            <div
              className="h-full rounded-full bg-[var(--tg-theme-button-color)] transition-[width] duration-300 ease-out"
              style={{ width: filled ? '100%' : '0%' }}
            />
          </div>
        );
      })}
    </div>
  );
}
