import type { ScholarshipTrack } from './contracts';

export const scholarshipAvailability = {
  nawa_director: 'available',
  health_minister: 'coming_soon',
  culture_minister: 'coming_soon',
} as const satisfies Record<ScholarshipTrack, 'available' | 'coming_soon'>;

export function isScholarshipTrackAvailable(track: ScholarshipTrack): boolean {
  return scholarshipAvailability[track] === 'available';
}
