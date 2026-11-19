/**
 * Cities where a NAWA preparatory course can be held. NAWA assigns the centre and publishes no list for the Anders
 * programme (docs/adr/0007), so this is a curated list of Polish academic cities plus "other"; the Polish spelling is
 * used in every interface language.
 */
export const OTHER_CITY = 'other';

export const prepCourseCities: readonly string[] = [
  'Białystok',
  'Bielsko-Biała',
  'Bydgoszcz',
  'Częstochowa',
  'Elbląg',
  'Gdańsk',
  'Gdynia',
  'Gliwice',
  'Gorzów Wielkopolski',
  'Kalisz',
  'Katowice',
  'Kielce',
  'Koszalin',
  'Kraków',
  'Legnica',
  'Lublin',
  'Łódź',
  'Nowy Sącz',
  'Olsztyn',
  'Opole',
  'Piła',
  'Płock',
  'Poznań',
  'Przemyśl',
  'Radom',
  'Rzeszów',
  'Siedlce',
  'Słupsk',
  'Sosnowiec',
  'Szczecin',
  'Tarnów',
  'Toruń',
  'Warszawa',
  'Wrocław',
  'Zamość',
  'Zielona Góra',
];

export function isPrepCourseCity(value: string): boolean {
  return value === OTHER_CITY || prepCourseCities.includes(value);
}
