import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { TAPE_MAX_SCORE, TAPE_PX_PER_POINT, tapeOffsetPx } from '../lib/score-tape';

/** Printed ink on the yellow tape stays dark in both themes. */
const TAPE_INK = '#14161a';
const FLAG_RED = '#c8102e';

const TAPE_WIDTH = TAPE_MAX_SCORE * TAPE_PX_PER_POINT;
const CASE_WIDTH = 92;
const LABEL_POINTS = Array.from({ length: 10 }, (_, index) => index * 10);

const tickBackground = [
  `linear-gradient(90deg, ${TAPE_INK} 1px, transparent 1px) 0 100% / ${TAPE_PX_PER_POINT}px 14px repeat-x`,
  `linear-gradient(90deg, ${TAPE_INK} 2px, transparent 2px) 0 100% / ${TAPE_PX_PER_POINT * 5}px 26px repeat-x`,
  `linear-gradient(90deg, ${TAPE_INK} 2px, transparent 2px) 0 100% / ${TAPE_PX_PER_POINT * 10}px 42px repeat-x`,
  'var(--color-accent)',
].join(', ');

type ScoreTapeProps = {
  score: number;
  threshold: number;
  ariaLabel: string;
  thresholdLabel: string;
  /** Called when a drag starts, so the parent can remember the starting value. */
  onDragStart: () => void;
  /** Total horizontal travel in px since the drag started (negative = dragged left). */
  onDrag: (dxPx: number) => void;
  /** Keyboard nudge: ±1 is one step, ±10 a page. */
  onStep: (steps: number) => void;
};

export function ScoreTape({
  score,
  threshold,
  ariaLabel,
  thresholdLabel,
  onDragStart,
  onDrag,
  onStep,
}: ScoreTapeProps) {
  const drag = useRef<{ pointerId: number; startX: number } | null>(null);
  const offset = tapeOffsetPx(score);
  const thresholdX = threshold * TAPE_PX_PER_POINT;
  const flagLeft = `clamp(8px, calc(50% + ${thresholdX - offset}px - 4px), calc(100% - 104px))`;

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = { pointerId: event.pointerId, startX: event.clientX };
    event.currentTarget.setPointerCapture(event.pointerId);
    onDragStart();
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    onDrag(event.clientX - active.startX);
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = {
      ArrowRight: 1,
      ArrowUp: 1,
      ArrowLeft: -1,
      ArrowDown: -1,
      PageUp: 10,
      PageDown: -10,
    };
    const delta = steps[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    onStep(delta);
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={TAPE_MAX_SCORE}
      aria-valuenow={score}
      aria-valuetext={ariaLabel}
      className="relative h-[150px] cursor-grab touch-pan-y select-none overflow-hidden outline-none active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-accent-ink)]"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={handleKeyDown}
    >
      <div
        aria-hidden="true"
        className="absolute top-10 h-[76px]"
        style={{
          left: '50%',
          width: TAPE_WIDTH,
          background: tickBackground,
          transform: `translateX(${-offset}px)`,
        }}
      >
        <div
          className="absolute left-0 top-0 h-full"
          style={{
            width: thresholdX,
            background: `repeating-linear-gradient(135deg, rgba(20,22,26,.2) 0 5px, transparent 5px 10px)`,
          }}
        />
        {LABEL_POINTS.map((point) => (
          <span
            key={point}
            className="font-display absolute top-2 text-[17px] font-semibold leading-none"
            style={{ left: point * TAPE_PX_PER_POINT + 4, color: TAPE_INK }}
          >
            {point}
          </span>
        ))}
        <div
          className="absolute"
          style={{
            left: thresholdX - 1.5,
            top: -26,
            width: 3,
            height: 102,
            background: FLAG_RED,
          }}
        />
        <div
          className="absolute top-0 h-full"
          style={{
            left: TAPE_WIDTH,
            width: CASE_WIDTH,
            background: TAPE_INK,
            borderRadius: '0 10px 10px 0',
            boxShadow: '0 0 0 1px var(--section-divider-color)',
          }}
        >
          <span className="font-display absolute left-2 top-2 text-[17px] font-semibold leading-none text-[var(--color-accent)]">
            {TAPE_MAX_SCORE}
          </span>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="absolute top-0.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-[12.5px] font-semibold text-white"
        style={{ left: flagLeft, background: FLAG_RED }}
      >
        {thresholdLabel}
      </div>

      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-full w-0">
        <div
          className="absolute top-4"
          style={{
            left: -13,
            width: 0,
            height: 0,
            borderLeft: '13px solid transparent',
            borderRight: '13px solid transparent',
            borderTop: '16px solid var(--text-primary)',
          }}
        />
        <div
          className="absolute"
          style={{ left: -2, top: 30, width: 4, height: 10, background: 'var(--text-primary)' }}
        />
        <div
          className="absolute"
          style={{ left: -2, top: 40, width: 4, height: 76, background: TAPE_INK, borderRadius: 2 }}
        />
        <div
          className="absolute"
          style={{ left: -2, top: 116, width: 4, height: 14, background: 'var(--text-primary)' }}
        />
        <div
          className="absolute box-border rounded-full"
          style={{
            left: -11,
            top: 122,
            width: 22,
            height: 22,
            background: 'var(--text-primary)',
            border: '3px solid var(--tg-theme-bg-color)',
          }}
        />
      </div>
    </div>
  );
}
