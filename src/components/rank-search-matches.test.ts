import { describe, expect, it } from 'vitest';
import { normalizeSearchText } from '../../shared/university-search/normalize';
import { rankSearchMatches } from './rank-search-matches';

const labels = (items: readonly { label: string }[]) => items.map((item) => item.label);
const opts = (...names: string[]) => names.map((label) => ({ label }));

describe('rankSearchMatches', () => {
  it('orders matches by tier: starts-with, word-start, then substring (A1)', () => {
    const matches = opts(
      'Automatyka i informatyka przemysłowa',
      'Bioinformatyka',
      'Informatyka',
      'Informatyka stosowana',
      'Zarządzanie i informatyka',
    );

    expect(labels(rankSearchMatches(matches, 'informat'))).toEqual([
      'Informatyka',
      'Informatyka stosowana',
      'Automatyka i informatyka przemysłowa',
      'Zarządzanie i informatyka',
      'Bioinformatyka',
    ]);
  });

  it('puts a label equal to the query first, ignoring case and surrounding spaces (A2)', () => {
    const matches = opts('Informatyka stosowana', 'Bioinformatyka', 'Informatyka');

    expect(labels(rankSearchMatches(matches, ' INFORMATYKA '))[0]).toBe('Informatyka');
  });

  it('keeps the original order inside a tier (A3)', () => {
    const matches = opts('Zeta informatyka', 'Alfa informatyka', 'Mega informatyka');

    expect(labels(rankSearchMatches(matches, 'informatyka'))).toEqual([
      'Zeta informatyka',
      'Alfa informatyka',
      'Mega informatyka',
    ]);
  });

  it('ranks a query without diacritics like one with them (A8)', () => {
    const matches = opts('Automatyka i zarządzanie', 'Zarządzanie');

    expect(labels(rankSearchMatches(matches, 'zarzadzanie'))).toEqual([
      'Zarządzanie',
      'Automatyka i zarządzanie',
    ]);
    expect(normalizeSearchText('Zarządzanie')).toBe('zarzadzanie');
  });

  it('treats a word after -, /, ( or , as a word start', () => {
    const matches = opts('Xinformatyka', 'Data-informatyka', 'Data/informatyka', 'Data (informatyka)', 'Data, informatyka');

    expect(labels(rankSearchMatches(matches, 'informatyka'))).toEqual([
      'Data-informatyka',
      'Data/informatyka',
      'Data (informatyka)',
      'Data, informatyka',
      'Xinformatyka',
    ]);
  });

  it('puts an option that fits no tier last instead of dropping it', () => {
    const matches = [{ label: 'Alias only' }, { label: 'Informatyka' }];

    expect(labels(rankSearchMatches(matches, 'informatyka'))).toEqual(['Informatyka', 'Alias only']);
  });

  it('keeps group order by first appearance and ranks inside each group (A9)', () => {
    const matches = [
      { label: 'Ukraina', group: 'P' },
      { label: 'Gwinea' },
      { label: 'Indie' },
    ];

    expect(labels(rankSearchMatches(matches, 'in'))).toEqual(['Ukraina', 'Indie', 'Gwinea']);
  });

  it('ranks an option by its best name across aliases (A2)', () => {
    const matches = [
      { label: 'Gwatemala', aliases: ['Guatemala', 'GT'] },
      { label: 'Ukraina', aliases: ['Ukraine', 'Украина', 'UA'] },
    ];

    expect(labels(rankSearchMatches(matches, 'ua'))).toEqual(['Ukraina', 'Gwatemala']);
    expect(labels(rankSearchMatches(matches, 'ukraine'))[0]).toBe('Ukraina');
    expect(labels(rankSearchMatches(matches, 'УКРАИНА'))[0]).toBe('Ukraina');
  });

  it('returns the same set of options', () => {
    const matches = opts('B informatyka', 'Informatyka', 'Cinformatyka');
    const ranked = rankSearchMatches(matches, 'informatyka');

    expect(ranked).toHaveLength(matches.length);
    expect(new Set(ranked)).toEqual(new Set(matches));
  });
});
