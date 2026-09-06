import type { ScholarshipTrack } from '../../shared/contracts';
import { scholarshipAvailability } from '../../shared/scholarship-availability';
import { useI18n } from '../i18n/context';

type ScholarshipEntryCardsProps = {
  onSelect: (track: ScholarshipTrack) => void;
  disabled?: boolean;
};

const cardBase =
  'flex w-full flex-col gap-1 rounded-2xl border px-4 py-3 text-left transition-opacity';

export function ScholarshipEntryCards({ onSelect, disabled = false }: ScholarshipEntryCardsProps) {
  const { t } = useI18n();

  const tracks: ScholarshipTrack[] = ['nawa_director', 'health_minister', 'culture_minister'];

  return (
    <div className="space-y-2" role="list">
      {tracks.map((track) => {
        const available = scholarshipAvailability[track] === 'available';
        const cardClass = available
          ? `${cardBase} border-[color-mix(in_srgb,var(--color-accent)_35%,var(--section-divider-color))] bg-[var(--tg-theme-section-bg-color)] hover:opacity-90 active:opacity-70`
          : `${cardBase} border-[var(--section-divider-color)] bg-[var(--tg-theme-secondary-bg-color)] opacity-70`;

        return (
          <button
            key={track}
            type="button"
            role="listitem"
            disabled={disabled || !available}
            className={cardClass}
            onClick={() => {
              if (!available) return;
              onSelect(track);
            }}
          >
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {t.choices.scholarshipTrack[track]}
            </span>
            {available ? (
              <span className="text-xs font-medium text-[var(--tg-theme-link-color)]">
                {t.scholarshipEntry.cta}
              </span>
            ) : (
              <span className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--text-helper)]">
                {t.scholarshipEntry.comingSoon}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
