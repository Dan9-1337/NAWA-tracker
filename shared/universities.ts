import type { ScholarshipTrack } from './contracts';
import { universitySearchMetadata } from './universities-metadata';

export const universityMinistries = ['science', 'culture', 'health'] as const;
export type UniversityMinistry = (typeof universityMinistries)[number];

export type University = {
  id: string;
  name: string;
  ministry: UniversityMinistry;
  city?: string;
  shortNames?: readonly string[];
  aliases?: readonly string[];
  formerNames?: readonly string[];
};

export function mergeUniversityMetadata(university: University): University {
  const meta = universitySearchMetadata[university.id];
  if (!meta) return university;
  return {
    ...university,
    ...meta,
    shortNames: meta.shortNames ?? university.shortNames,
    aliases: meta.aliases ?? university.aliases,
    formerNames: meta.formerNames ?? university.formerNames,
    city: meta.city ?? university.city,
  };
}

export function enrichUniversities(list: readonly University[]): University[] {
  return list.map(mergeUniversityMetadata);
}

/** Partner universities with a NAWA framework agreement, grouped by supervising ministry. */
export const universities: readonly University[] = [
  // Uczelnie nadzorowane przez Ministra Nauki i Szkolnictwa Wyższego
  { id: 'science-001', ministry: 'science', name: 'Akademia Bialska im. Jana Pawła II Biała Podlaska' },
  { id: 'science-002', ministry: 'science', name: 'Akademia Finansów i Biznesu VISTULA w Warszawie' },
  { id: 'science-003', ministry: 'science', name: 'Akademia Górniczo-Hutnicza im. Stanisława Staszica w Krakowie' },
  { id: 'science-004', ministry: 'science', name: 'Akademia im. Jakuba z Paradyża w Gorzowie Wielkopolskim' },
  { id: 'science-005', ministry: 'science', name: 'Akademia Kultury Fizycznej im. Bronisława Czecha w Krakowie' },
  { id: 'science-006', ministry: 'science', name: 'Akademia Kultury Społecznej i Medialnej w Toruniu' },
  { id: 'science-007', ministry: 'science', name: 'Akademia Leona Koźmińskiego w Warszawie' },
  { id: 'science-008', ministry: 'science', name: 'Akademia Łomżyńska' },
  { id: 'science-009', ministry: 'science', name: 'Akademia Nauk Stosowanych w Bielsku Białej' },
  { id: 'science-010', ministry: 'science', name: 'Akademia Nauk Stosowanych w Elblągu' },
  { id: 'science-011', ministry: 'science', name: 'Akademia Nauk Stosowanych w Nowym Targu' },
  { id: 'science-012', ministry: 'science', name: 'Akademia Nauk Stosowanych Wincentego Pola' },
  { id: 'science-013', ministry: 'science', name: 'Akademia Nauk Stosowanych WSZiA w Opolu' },
  { id: 'science-014', ministry: 'science', name: 'Akademia Pedagogiki Specjalnej im. Marii Grzegorzewskiej w Warszawie' },
  { id: 'science-015', ministry: 'science', name: 'Akademia Tarnowska' },
  { id: 'science-016', ministry: 'science', name: 'Akademia Techniczno-Artystyczna Nauk Stosowanych w Warszawie' },
  { id: 'science-017', ministry: 'science', name: 'Akademia WIT w Warszawie' },
  { id: 'science-018', ministry: 'science', name: 'Akademia WSB z siedzibą w Dąbrowie Górniczej' },
  { id: 'science-019', ministry: 'science', name: 'Akademia Wychowania Fizycznego i Sportu im. Jędrzeja Śniadeckiego w Gdańsku' },
  { id: 'science-020', ministry: 'science', name: 'Akademia Wychowania Fizycznego im. Eugeniusza Piaseckiego w Poznaniu' },
  { id: 'science-021', ministry: 'science', name: 'Akademia Wychowania Fizycznego im. J. Kukuczki w Katowicach' },
  { id: 'science-022', ministry: 'science', name: 'Akademia Wychowania Fizycznego im. Polskich Olimpijczyków we Wrocławiu' },
  { id: 'science-023', ministry: 'science', name: 'Akademia Wychowania Fizycznego Józefa Piłsudskiego w Warszawie' },
  { id: 'science-024', ministry: 'science', name: 'Akademia Zamojska' },
  { id: 'science-025', ministry: 'science', name: 'Chrześcijańska Akademia Teologiczna w Warszawie' },
  { id: 'science-026', ministry: 'science', name: 'Collegium Da Vinci z siedzibą w Poznaniu' },
  { id: 'science-027', ministry: 'science', name: 'Europejska Uczelnia Nauk Medycznych i Społecznych Warszawa' },
  { id: 'science-028', ministry: 'science', name: 'Katolicki Uniwersytet Lubelski Jana Pawła II w Lublinie' },
  { id: 'science-029', ministry: 'science', name: 'Międzynarodowa Wyższa Szkoła Logistyki i Transportu we Wrocławiu' },
  { id: 'science-030', ministry: 'science', name: 'Państwowa Akademia Nauk Stosowanych im. ks. Bronisława Markiewicza w Jarosławiu' },
  { id: 'science-031', ministry: 'science', name: 'Państwowa Akademia Nauk Stosowanych w Chełmie' },
  { id: 'science-032', ministry: 'science', name: 'Państwowa Akademia Nauk Stosowanych w Przemyślu' },
  { id: 'science-033', ministry: 'science', name: 'Państwowa Uczelnia Zawodowa im. prof. Edwarda F. Szczepanika w Suwałkach' },
  { id: 'science-034', ministry: 'science', name: 'Papieski Wydział Teologiczny we Wrocławiu' },
  { id: 'science-035', ministry: 'science', name: 'Politechnika Białostocka' },
  { id: 'science-036', ministry: 'science', name: 'Politechnika Bydgoska im. Jana i Jędrzeja Śniadeckich' },
  { id: 'science-037', ministry: 'science', name: 'Politechnika Częstochowska' },
  { id: 'science-038', ministry: 'science', name: 'Politechnika Gdańska' },
  { id: 'science-039', ministry: 'science', name: 'Politechnika Koszalińska' },
  { id: 'science-040', ministry: 'science', name: 'Politechnika Krakowska im. Tadeusza Kościuszki' },
  { id: 'science-041', ministry: 'science', name: 'Politechnika Lubelska' },
  { id: 'science-042', ministry: 'science', name: 'Politechnika Łódzka' },
  { id: 'science-043', ministry: 'science', name: 'Politechnika Opolska' },
  { id: 'science-044', ministry: 'science', name: 'Politechnika Poznańska' },
  { id: 'science-045', ministry: 'science', name: 'Politechnika Rzeszowska im. Ignacego Łukasiewicza' },
  { id: 'science-046', ministry: 'science', name: 'Politechnika Śląska' },
  { id: 'science-047', ministry: 'science', name: 'Politechnika Świętokrzyska w Kielcach' },
  { id: 'science-048', ministry: 'science', name: 'Politechnika Warszawska' },
  { id: 'science-049', ministry: 'science', name: 'Politechnika Wrocławska' },
  { id: 'science-050', ministry: 'science', name: 'Polsko-Japońska Akademia Technik Komputerowych w Warszawie' },
  { id: 'science-051', ministry: 'science', name: 'Sopocka Akademia Nauk Stosowanych' },
  { id: 'science-052', ministry: 'science', name: 'Społeczna Akademia Nauk z siedzibą w Łodzi' },
  { id: 'science-053', ministry: 'science', name: 'Szkoła Główna Gospodarstwa Wiejskiego w Warszawie' },
  { id: 'science-054', ministry: 'science', name: 'Szkoła Główna Handlowa w Warszawie' },
  { id: 'science-055', ministry: 'science', name: 'Szkoła Główna Turystyki i Hotelarstwa VISTULA w Warszawie' },
  { id: 'science-056', ministry: 'science', name: 'Uczelnia Łazarskiego w Warszawie' },
  { id: 'science-057', ministry: 'science', name: 'Uczelnia Państwowa im. Jana Grodka w Sanoku' },
  { id: 'science-058', ministry: 'science', name: 'Uczelnia Społeczno-Medyczna w Warszawie' },
  { id: 'science-059', ministry: 'science', name: 'Uczelnia Techniczno-Handlowa im. Heleny Chodkowskiej w Warszawie' },
  { id: 'science-060', ministry: 'science', name: 'Uniwersytet Andrzeja Frycza Modrzewskiego w Krakowie' },
  { id: 'science-061', ministry: 'science', name: 'Uniwersytet Bielsko-Bialski' },
  { id: 'science-062', ministry: 'science', name: 'Uniwersytet Civitas Warszawa' },
  { id: 'science-063', ministry: 'science', name: 'Uniwersytet Dolnośląski DSW we Wrocławiu' },
  { id: 'science-064', ministry: 'science', name: 'Uniwersytet Ekonomiczny w Katowicach' },
  { id: 'science-065', ministry: 'science', name: 'Uniwersytet Ekonomiczny w Krakowie' },
  { id: 'science-066', ministry: 'science', name: 'Uniwersytet Ekonomiczny w Poznaniu' },
  { id: 'science-067', ministry: 'science', name: 'Uniwersytet Ekonomiczny we Wrocławiu' },
  { id: 'science-068', ministry: 'science', name: 'Uniwersytet Gdański' },
  { id: 'science-069', ministry: 'science', name: 'Uniwersytet Ignatianum w Krakowie' },
  { id: 'science-070', ministry: 'science', name: 'Uniwersytet im. Adama Mickiewicza w Poznaniu' },
  { id: 'science-071', ministry: 'science', name: 'Uniwersytet Jagielloński w Krakowie' },
  { id: 'science-072', ministry: 'science', name: 'Uniwersytet Jana Długosza w Częstochowie' },
  { id: 'science-073', ministry: 'science', name: 'Uniwersytet Jana Kochanowskiego w Kielcach' },
  { id: 'science-074', ministry: 'science', name: 'Uniwersytet Kardynała Stefana Wyszyńskiego w Warszawie' },
  { id: 'science-075', ministry: 'science', name: 'Uniwersytet Kazimierza Wielkiego w Bydgoszczy' },
  { id: 'science-076', ministry: 'science', name: 'Uniwersytet Komisji Edukacji Narodowej w Krakowie' },
  { id: 'science-077', ministry: 'science', name: 'Uniwersytet Łódzki' },
  { id: 'science-078', ministry: 'science', name: 'Uniwersytet Marii Curie-Skłodowskiej w Lublinie' },
  { id: 'science-079', ministry: 'science', name: 'Uniwersytet Mikołaja Kopernika w Toruniu' },
  { id: 'science-080', ministry: 'science', name: 'Uniwersytet Opolski' },
  { id: 'science-081', ministry: 'science', name: 'Uniwersytet Papieski Jana Pawła II w Krakowie' },
  { id: 'science-082', ministry: 'science', name: 'Uniwersytet Pomorski w Słupsku' },
  { id: 'science-083', ministry: 'science', name: 'Uniwersytet Przyrodniczy w Lublinie' },
  { id: 'science-084', ministry: 'science', name: 'Uniwersytet Przyrodniczy w Poznaniu' },
  { id: 'science-085', ministry: 'science', name: 'Uniwersytet Przyrodniczy we Wrocławiu' },
  { id: 'science-086', ministry: 'science', name: 'Uniwersytet Radomski im. Kazimierza Pułaskiego' },
  { id: 'science-087', ministry: 'science', name: 'Uniwersytet Rolniczy im. Hugona Kołłątaja w Krakowie' },
  { id: 'science-088', ministry: 'science', name: 'Uniwersytet Rzeszowski' },
  { id: 'science-089', ministry: 'science', name: 'Uniwersytet SWPS w Warszawie' },
  { id: 'science-090', ministry: 'science', name: 'Uniwersytet Szczeciński' },
  { id: 'science-091', ministry: 'science', name: 'Uniwersytet Śląski w Katowicach' },
  { id: 'science-092', ministry: 'science', name: 'Uniwersytet Vizja w Warszawie' },
  { id: 'science-093', ministry: 'science', name: 'Uniwersytet w Białymstoku' },
  { id: 'science-094', ministry: 'science', name: 'Uniwersytet w Siedlcach' },
  { id: 'science-095', ministry: 'science', name: 'Uniwersytet Warmińsko-Mazurski w Olsztynie' },
  { id: 'science-096', ministry: 'science', name: 'Uniwersytet Warszawski' },
  { id: 'science-097', ministry: 'science', name: 'Uniwersytet Wrocławski' },
  { id: 'science-098', ministry: 'science', name: 'Uniwersytet WSB Merito w Gdańsku' },
  { id: 'science-099', ministry: 'science', name: 'Uniwersytet WSB Merito w Poznaniu' },
  { id: 'science-100', ministry: 'science', name: 'Uniwersytet WSB Merito we Wrocławiu' },
  { id: 'science-101', ministry: 'science', name: 'Uniwersytet Zielonogórski' },
  { id: 'science-102', ministry: 'science', name: 'Wyższa Szkoła Biznesu i Nauk o Zdrowiu w Łodzi' },
  { id: 'science-103', ministry: 'science', name: 'Wyższa Szkoła Gospodarki w Bydgoszczy' },
  { id: 'science-104', ministry: 'science', name: 'Wyższa Szkoła Informatyki i Zarządzania z siedzibą w Rzeszowie' },
  { id: 'science-105', ministry: 'science', name: 'Wyższa Szkoła Inżynierii i Zdrowia w Warszawie' },
  { id: 'science-106', ministry: 'science', name: 'Wyższa Szkoła Logistyki z siedzibą w Poznaniu' },
  { id: 'science-107', ministry: 'science', name: 'Wyższa Szkoła Przedsiębiorczości i Administracji w Lublinie' },
  { id: 'science-108', ministry: 'science', name: 'Wyższa Szkoła Sztuki i Projektowania w Łodzi' },
  { id: 'science-109', ministry: 'science', name: 'Wyższa Szkoła Technologii Informatycznych w Katowicach' },
  { id: 'science-110', ministry: 'science', name: 'Wyższa Szkoła Turystyki i Ekologii w Suchej Beskidzkiej' },
  { id: 'science-111', ministry: 'science', name: 'Wyższa Szkoła Zarządzania i Bankowości w Krakowie' },
  { id: 'science-112', ministry: 'science', name: 'Wyższa Szkoła Zdrowia w Gdańsku' },
  { id: 'science-113', ministry: 'science', name: 'Zachodniopomorski Uniwersytet Technologiczny w Szczecinie' },

  // Uczelnie nadzorowane przez Ministra Kultury i Dziedzictwa Narodowego
  { id: 'culture-001', ministry: 'culture', name: 'Akademia Muzyczna im. Feliksa Nowowiejskiego w Bydgoszczy' },
  { id: 'culture-002', ministry: 'culture', name: 'Akademia Muzyczna im. Grażyny i Kiejstuta Bacewiczów w Łodzi' },
  { id: 'culture-003', ministry: 'culture', name: 'Akademia Muzyczna im. Ignacego Jana Paderewskiego w Poznaniu' },
  { id: 'culture-004', ministry: 'culture', name: 'Akademia Muzyczna im. Karola Lipińskiego we Wrocławiu' },
  { id: 'culture-005', ministry: 'culture', name: 'Akademia Muzyczna im. Karola Szymanowskiego w Katowicach' },
  { id: 'culture-006', ministry: 'culture', name: 'Akademia Muzyczna im. Krzysztofa Pendereckiego w Krakowie' },
  { id: 'culture-007', ministry: 'culture', name: 'Akademia Muzyczna im. Stanisława Moniuszki w Gdańsku' },
  { id: 'culture-008', ministry: 'culture', name: 'Akademia Sztuk Pięknych im. Eugeniusza Gepperta we Wrocławiu' },
  { id: 'culture-009', ministry: 'culture', name: 'Akademia Sztuk Pięknych im. Jana Matejki w Krakowie' },
  { id: 'culture-010', ministry: 'culture', name: 'Akademia Sztuk Pięknych im. Władysława Strzemińskiego w Łodzi' },
  { id: 'culture-011', ministry: 'culture', name: 'Akademia Sztuk Pięknych w Gdańsku' },
  { id: 'culture-012', ministry: 'culture', name: 'Akademia Sztuk Pięknych w Katowicach' },
  { id: 'culture-013', ministry: 'culture', name: 'Akademia Sztuk Pięknych w Warszawie' },
  { id: 'culture-014', ministry: 'culture', name: 'Akademia Sztuk Teatralnych im. Stanisława Wyspiańskiego w Krakowie' },
  { id: 'culture-015', ministry: 'culture', name: 'Akademia Sztuki w Szczecinie' },
  { id: 'culture-016', ministry: 'culture', name: 'Akademia Teatralna im. Aleksandra Zelwerowicza w Warszawie' },
  { id: 'culture-017', ministry: 'culture', name: 'Państwowa Wyższa Szkoła Filmowa, Telewizyjna i Teatralna im. Leona Schillera w Łodzi' },
  { id: 'culture-018', ministry: 'culture', name: 'Uniwersytet Artystyczny im. Magdaleny Abakanowicz w Poznaniu' },
  { id: 'culture-019', ministry: 'culture', name: 'Uniwersytet Muzyczny Fryderyka Chopina w Warszawie' },

  // Uczelnie nadzorowane przez Ministra Zdrowia
  { id: 'health-001', ministry: 'health', name: 'Gdański Uniwersytet Medyczny' },
  { id: 'health-002', ministry: 'health', name: 'Pomorski Uniwersytet Medyczny w Szczecinie' },
  { id: 'health-003', ministry: 'health', name: 'Śląski Uniwersytet Medyczny w Katowicach' },
  { id: 'health-004', ministry: 'health', name: 'Uniwersytet Medyczny im. Karola Marcinkowskiego w Poznaniu' },
  { id: 'health-005', ministry: 'health', name: 'Uniwersytet Medyczny im. Piastów Śląskich we Wrocławiu' },
  { id: 'health-006', ministry: 'health', name: 'Uniwersytet Medyczny w Białymstoku' },
  { id: 'health-007', ministry: 'health', name: 'Uniwersytet Medyczny w Lublinie' },
  { id: 'health-008', ministry: 'health', name: 'Uniwersytet Medyczny w Łodzi' },
  { id: 'health-009', ministry: 'health', name: 'Warszawski Uniwersytet Medyczny' },
] as const;

const enrichedUniversities = enrichUniversities(universities);

const universityByIdMap = new Map(enrichedUniversities.map((university) => [university.id, university]));

const trackMinistry: Record<ScholarshipTrack, UniversityMinistry> = {
  nawa_director: 'science',
  culture_minister: 'culture',
  health_minister: 'health',
};

export function isUniversityId(value: string): boolean {
  return universityByIdMap.has(value);
}

export function getUniversityById(id: string): University | undefined {
  return universityByIdMap.get(id);
}

export function ministryForScholarshipTrack(track: ScholarshipTrack): UniversityMinistry {
  return trackMinistry[track];
}

export function universitiesForScholarshipTrack(track: ScholarshipTrack): readonly University[] {
  const ministry = ministryForScholarshipTrack(track);
  return enrichedUniversities.filter((university) => university.ministry === ministry);
}

export function isUniversityAllowedForTrack(id: string, track: ScholarshipTrack): boolean {
  const university = getUniversityById(id);
  return university != null && university.ministry === ministryForScholarshipTrack(track);
}

/** Raw catalog entries without search metadata merge (for reconcile scripts). */
export function getRawUniversities(): readonly University[] {
  return universities;
}

export function getEnrichedUniversityById(id: string): University | undefined {
  const base = universities.find((u) => u.id === id);
  return base ? mergeUniversityMetadata(base) : undefined;
}
