import type { ReactNode } from 'react';

/** One decorative placeholder block; size and shape come from `className` (height, width, radius). */
export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton-block ${className}`.trim()} />;
}

type SkeletonStatusProps = {
  /** Localized loading label: the container's accessible name, visually hidden. */
  label: string;
  /** Visually hidden text content when it differs from the accessible name. */
  text?: string;
  className?: string;
  children: ReactNode;
};

/** A polite live region wrapping skeleton blocks; assistive technology reads only the label. */
export function SkeletonStatus({ label, text, className, children }: SkeletonStatusProps) {
  return (
    <div role="status" aria-live="polite" aria-label={label} className={className}>
      <span className="sr-only">{text ?? label}</span>
      {children}
    </div>
  );
}
