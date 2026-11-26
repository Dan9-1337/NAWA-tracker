import { describe, expect, it } from 'vitest';
import {
  getPrepCourseCentres,
  prepCourseCentreLabel,
  prepCourseCentresByYear,
  type PrepCourseCentre,
} from './prep-course-centres';
import { getUniversityById } from './universities';

const centres = prepCourseCentresByYear[2026] ?? [];

const expected2026 = [
  ['Uniwersytet Śląski w Katowicach', 'Katowice'],
  ['Uniwersytet Łódzki', 'Łódź'],
  ['Uniwersytet Marii Curie-Skłodowskiej w Lublinie', 'Lublin'],
  ['Politechnika Krakowska im. Tadeusza Kościuszki', 'Kraków'],
  ['Uniwersytet w Siedlcach', 'Siedlce'],
  ['Uniwersytet Gdański', 'Gdańsk'],
  ['Uniwersytet Mikołaja Kopernika w Toruniu', 'Toruń'],
  ['Uniwersytet Rzeszowski', 'Rzeszów'],
  ['Katolicki Uniwersytet Lubelski Jana Pawła II', 'Lublin'],
  ['Politechnika Wrocławska', 'Wrocław'],
] as const;

const officialDomains: Readonly<Record<string, string>> = {
  'us-katowice': 'us.edu.pl',
  'ul-lodz': 'uni.lodz.pl',
  'umcs-lublin': 'umcs.pl',
  'pk-krakow': 'pk.edu.pl',
  'uws-siedlce': 'uws.edu.pl',
  'ug-gdansk': 'ug.edu.pl',
  'umk-torun': 'umk.pl',
  'ur-rzeszow': 'ur.edu.pl',
  'kul-lublin': 'kul.pl',
  'pwr-wroclaw': 'pwr.edu.pl',
};

describe('prepCourseCentres 2026', () => {
  it('lists exactly the ten institutions of the NAWA list, in order, with cities', () => {
    expect(centres).toHaveLength(expected2026.length);
    expect(centres.map((centre) => [centre.university, centre.city])).toEqual(expected2026);
    expect(new Set(centres.map((centre) => centre.id)).size).toBe(centres.length);
    expect(centres.every((centre) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(centre.id))).toBe(true);
    expect(centres.every((centre) => centre.shortName.trim() !== '')).toBe(true);
  });

  it('links every centre to an existing university catalogue id', () => {
    for (const centre of centres) {
      expect(centre.universityId, centre.id).not.toBeNull();
      expect(getUniversityById(centre.universityId!), centre.id).toBeDefined();
    }
  });

  it('keeps unit and source together on an https page of the university own domain', () => {
    for (const centre of centres) {
      if (centre.unit === null) {
        expect(centre.unitSourceUrl, centre.id).toBeNull();
        continue;
      }
      expect(centre.unit.trim(), centre.id).not.toBe('');
      expect(centre.unitSourceUrl, centre.id).toMatch(/^https:\/\//);
      const host = new URL(centre.unitSourceUrl!).hostname;
      const domain = officialDomains[centre.id];
      expect(domain, centre.id).toBeDefined();
      expect(host === domain || host.endsWith(`.${domain}`), `${centre.id}: ${host}`).toBe(true);
    }
  });

  it('returns the list by year and an empty list for an unknown year', () => {
    expect(getPrepCourseCentres(2026)).toBe(centres);
    expect(getPrepCourseCentres(2025)).toEqual([]);
  });
});

describe('prepCourseCentreLabel', () => {
  it('joins the short university name and the unit with an em dash', () => {
    const umcs = centres.find((centre) => centre.id === 'umcs-lublin');
    expect(umcs).toBeDefined();
    expect(prepCourseCentreLabel(umcs!)).toBe(
      'UMCS — Centrum Języka i Kultury Polskiej dla Polonii i Cudzoziemców',
    );
  });

  it('falls back to the university name when no unit is known', () => {
    const withoutUnit: PrepCourseCentre = {
      id: 'example',
      shortName: 'UEx',
      university: 'Uniwersytet Przykładowy',
      city: 'Warszawa',
      unit: null,
      unitSourceUrl: null,
      universityId: null,
    };
    expect(prepCourseCentreLabel(withoutUnit)).toBe('Uniwersytet Przykładowy');
  });
});
