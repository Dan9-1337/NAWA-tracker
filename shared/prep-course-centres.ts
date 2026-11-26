/**
 * NAWA preparatory-course centres, keyed by intake year. Only the institutions that received funding in the
 * official NAWA call are listed; there is no "other" option (docs/adr/0012). The 2026 list is the ten institutions
 * of "Lista Wnioskodawców otrzymujących finansowanie w programie Kursy Przygotowawcze NAWA 2026/2027"
 * (Warsaw, 10 September 2026), names checked against the PDF at
 * https://nawa.gov.pl/images/Kursy-Przygotowawcze-NAWA/2026/Lista-Wnioskodawcow-otrzymujacych-finansowanie-w-programie-Kursy-Przygotowawcze-NAWA-2026-2027.pdf.
 *
 * `unit` is the unit that runs the NAWA preparatory course, taken from the university's own official site;
 * `unitSourceUrl` is that page. Where no official page names the unit, both are null and the centre is shown by
 * the university name alone. The Polish spelling is used in every interface language, like the city list.
 *
 * Add a new year as a new key when NAWA publishes the results of the next call; do not rewrite past years.
 */
export type PrepCourseCentre = {
  /** Stable ASCII slug. */
  id: string;
  /** Common short name used in labels, e.g. "UMCS". */
  shortName: string;
  /** Exact Polish name from the NAWA list. */
  university: string;
  city: string;
  /** Unit that runs the NAWA preparatory course, or null when no official page names it. */
  unit: string | null;
  /** Official university page that names the unit, or null together with `unit`. */
  unitSourceUrl: string | null;
  /** Matching id in `shared/universities.ts`, or null when the university is not in the catalogue. */
  universityId: string | null;
};

export const prepCourseCentresByYear: Readonly<Record<number, readonly PrepCourseCentre[]>> = {
  2026: [
    {
      id: 'us-katowice',
      shortName: 'UŚ',
      university: 'Uniwersytet Śląski w Katowicach',
      city: 'Katowice',
      unit: 'Szkoła Języka i Kultury Polskiej',
      unitSourceUrl:
        'https://www.sjikp.us.edu.pl/pl/kurs-jezyka-polskiego-dla-kandydatow-na-studia-w-jezyku-polskim/',
      universityId: 'science-091',
    },
    {
      id: 'ul-lodz',
      shortName: 'UŁ',
      university: 'Uniwersytet Łódzki',
      city: 'Łódź',
      unit: 'Studium Języka Polskiego dla Cudzoziemców',
      unitSourceUrl: 'https://www.uni.lodz.pl/wydzialy-i-jednostki-ul/studium-jezyka-polskiego-dla-cudzoziemcow',
      universityId: 'science-077',
    },
    {
      id: 'umcs-lublin',
      shortName: 'UMCS',
      university: 'Uniwersytet Marii Curie-Skłodowskiej w Lublinie',
      city: 'Lublin',
      unit: 'Centrum Języka i Kultury Polskiej dla Polonii i Cudzoziemców',
      unitSourceUrl: 'https://www.umcs.pl/pl/cjkp.htm',
      universityId: 'science-078',
    },
    {
      id: 'pk-krakow',
      shortName: 'PK',
      university: 'Politechnika Krakowska im. Tadeusza Kościuszki',
      city: 'Kraków',
      unit: 'Międzynarodowe Centrum Kształcenia',
      unitSourceUrl: 'https://mck.pk.edu.pl/oferty/kursy-przygotowawcze',
      universityId: 'science-040',
    },
    {
      id: 'uws-siedlce',
      shortName: 'UwS',
      university: 'Uniwersytet w Siedlcach',
      city: 'Siedlce',
      unit: 'Ośrodek Języka Polskiego i Kultury Polskiej',
      unitSourceUrl:
        'https://www.uws.edu.pl/uniwersytet/aktualnosci/uniwersytet-w-siedlcach-z-akredytacja-nawa-na-lata-2026-2029',
      universityId: 'science-094',
    },
    {
      id: 'ug-gdansk',
      shortName: 'UG',
      university: 'Uniwersytet Gdański',
      city: 'Gdańsk',
      unit: 'Akademickie Centrum Języka Polskiego i Kultury Polskiej dla Cudzoziemców',
      unitSourceUrl:
        'https://polski.ug.edu.pl/akademickie-centrum-jezyka-polskiego-i-kultury-polskiej-ug-nowe-wyzwania-i-sukcesy',
      universityId: 'science-068',
    },
    {
      id: 'umk-torun',
      shortName: 'UMK',
      university: 'Uniwersytet Mikołaja Kopernika w Toruniu',
      city: 'Toruń',
      unit: 'Studium Kultury i Języka Polskiego dla Obcokrajowców',
      unitSourceUrl:
        'https://www.umk.pl/o-uczelni/jednostki/jednostki-dydaktyczne/studium-kultury-i-jezyka-polskiego-dla-obcokrajowcow/studium/',
      universityId: 'science-079',
    },
    {
      id: 'ur-rzeszow',
      shortName: 'UR',
      university: 'Uniwersytet Rzeszowski',
      city: 'Rzeszów',
      unit: 'Centrum Polonijne',
      unitSourceUrl: 'https://podyplomowe.ur.edu.pl/pl/kursy/kurs-przygotowawczy-do-podjecia-nauki-w-polsce',
      universityId: 'science-088',
    },
    {
      id: 'kul-lublin',
      shortName: 'KUL',
      university: 'Katolicki Uniwersytet Lubelski Jana Pawła II',
      city: 'Lublin',
      unit: 'Szkoła Języka i Kultury Polskiej',
      unitSourceUrl: 'https://www.kul.pl/kurs-przygotowawczy-do-podjecia-studiow-nawa,art_95358.html',
      universityId: 'science-028',
    },
    {
      id: 'pwr-wroclaw',
      shortName: 'PWr',
      university: 'Politechnika Wrocławska',
      city: 'Wrocław',
      unit: 'Ośrodek Języka Polskiego i Angielskiego dla Cudzoziemców',
      unitSourceUrl:
        'https://rekrutacja.pwr.edu.pl/dla-cudzoziemcow/kursy-jezykowe/roczny-kurs-jezyka-polskiego-2-semestralny',
      universityId: 'science-049',
    },
  ],
};

/** Centres of the given intake year, or an empty list when the year has no official list yet. */
export function getPrepCourseCentres(year: number): readonly PrepCourseCentre[] {
  return prepCourseCentresByYear[year] ?? [];
}

/** "UMCS — Centrum …" when the unit is known, otherwise the full university name. */
export function prepCourseCentreLabel(centre: PrepCourseCentre): string {
  return centre.unit ? `${centre.shortName} — ${centre.unit}` : centre.university;
}
