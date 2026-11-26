export type UniversitySearchMetadata = {
  city?: string;
  shortNames?: readonly string[];
  aliases?: readonly string[];
  formerNames?: readonly string[];
};

/** Search metadata keyed by stable university ID. Merged at runtime into University records. */
export const universitySearchMetadata: Record<string, UniversitySearchMetadata> = {
  'science-003': {
    city: 'Kraków',
    shortNames: ['AGH'],
    aliases: ['Akademia Górniczo-Hutnicza'],
  },
  'science-035': { city: 'Białystok', shortNames: ['PB'] },
  'science-038': { city: 'Gdańsk', shortNames: ['PG'] },
  'science-040': { city: 'Kraków', shortNames: ['PK'] },
  'science-044': { city: 'Poznań', shortNames: ['PP'] },
  'science-046': { city: 'Katowice', shortNames: ['PŚ'] },
  'science-048': { city: 'Warszawa', shortNames: ['PW'] },
  'science-049': {
    city: 'Wrocław',
    shortNames: ['PWr'],
    aliases: ['Wroclaw Tech', 'Wrocław Tech'],
  },
  'science-050': {
    city: 'Warszawa',
    shortNames: ['PJWSTK'],
    formerNames: ['Polsko-Japońska Akademia Technik Komputerowych'],
  },
  'science-052': { city: 'Łódź' },
  'science-053': {
    city: 'Warszawa',
    shortNames: ['SGGW'],
    aliases: ['Warsaw University of Life Sciences', 'Szkoła Główna Gospodarstwa Wiejskiego'],
  },
  'science-054': { city: 'Warszawa', shortNames: ['SGH'] },
  'science-064': {
    city: 'Katowice',
    shortNames: ['UEKat'],
    aliases: ['PUEB'],
    formerNames: ['Politechnika Ekonomiczna w Katowicach'],
  },
  'science-065': { city: 'Kraków', shortNames: ['UEK'] },
  'science-066': { city: 'Poznań', shortNames: ['UEP'] },
  'science-067': { city: 'Wrocław', shortNames: ['UEW'] },
  'science-068': { city: 'Gdańsk', shortNames: ['UG'] },
  'science-070': { city: 'Poznań', shortNames: ['UAM'] },
  'science-071': { city: 'Kraków', shortNames: ['UJ'] },
  'science-076': {
    city: 'Kraków',
    shortNames: ['UKEN'],
    formerNames: ['Uniwersytet Pedagogiczny w Krakowie', 'UP Kraków'],
  },
  'science-077': { city: 'Łódź', shortNames: ['UŁ'] },
  'science-091': { city: 'Katowice', shortNames: ['UŚ'] },
  'science-096': { city: 'Warszawa', shortNames: ['UW'] },
  'science-097': { city: 'Wrocław', shortNames: ['UWr'] },
  'science-113': { city: 'Szczecin', shortNames: ['ZUT'] },
  'culture-008': { city: 'Wrocław', shortNames: ['ASP Wrocław'], aliases: ['ASP we Wrocławiu'] },
  'culture-009': { city: 'Kraków', shortNames: ['ASP Kraków'] },
  'culture-010': { city: 'Łódź', shortNames: ['ASP Łódź'] },
  'culture-011': { city: 'Gdańsk', shortNames: ['ASP Gdańsk'] },
  'culture-012': { city: 'Katowice', shortNames: ['ASP Katowice'] },
  'culture-013': { city: 'Warszawa', shortNames: ['ASP Warszawa'] },
  'culture-014': {
    city: 'Kraków',
    shortNames: ['AST'],
    aliases: ['ATH'],
    formerNames: ['Akademia Teatralna w Krakowie'],
  },
  'culture-017': {
    city: 'Łódź',
    shortNames: ['PWSFTviT', 'PWSZ'],
    formerNames: ['Państwowa Wyższa Szkoła Filmowa w Łodzi'],
  },
  'culture-018': {
    city: 'Poznań',
    shortNames: ['UAP'],
    formerNames: ['Akademia Sztuk Pięknych w Poznaniu'],
  },
  'health-001': { city: 'Gdańsk', shortNames: ['GUMed'], aliases: ['PUMS', 'Medical University of Gdańsk'] },
  'health-002': { city: 'Szczecin', shortNames: ['PUM'] },
  'health-003': { city: 'Katowice', shortNames: ['SUM'] },
  'health-004': { city: 'Poznań', shortNames: ['UMP'] },
  'health-005': { city: 'Wrocław', shortNames: ['UMW'] },
  'health-006': { city: 'Białystok', shortNames: ['UMB'] },
  'health-007': { city: 'Lublin', shortNames: ['UM Lublin'] },
  'health-008': { city: 'Łódź', shortNames: ['UM Łódź'] },
  'health-009': { city: 'Warszawa', shortNames: ['WUM'] },
};

/** Aggregate selection counts for popularity tie-breaking (non-personal). */
export const universitySelectionCounts: Readonly<Record<string, number>> = {};
