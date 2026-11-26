export const scholarshipTracks = ['nawa_director', 'health_minister', 'culture_minister'] as const;
export type ScholarshipTrack = (typeof scholarshipTracks)[number];

export const studyRoutes = ['preparatory_course', 'direct_studies'] as const;
export type StudyRoute = (typeof studyRoutes)[number];

export const polishSchoolLevels = ['none', 'primary', 'secondary'] as const;
export type PolishSchoolLevel = (typeof polishSchoolLevels)[number];

export const applicationStatuses = [
  'submitted',
  'formal_review_positive',
  'merit_review_positive',
  'merit_review_negative',
  'scholarship_awarded',
  'scholarship_not_awarded',
] as const;
export type ApplicationStatus = (typeof applicationStatuses)[number];

/** Which document the declared average comes from (Ogłoszenie 13/2026, pkt 2.6). */
export const gradeBases = ['final_certificate', 'half_year'] as const;
export type GradeBasis = (typeof gradeBases)[number];

/** Students in Poland with an average >= 4.75 (scale 2-5) are assigned 100 points. */
export const applicantKinds = ['school_leaver', 'student_in_poland'] as const;
export type ApplicantKind = (typeof applicantKinds)[number];

export type ScoreBreakdown = {
  gradesScore: number;
  polishSchoolBonus: number;
  total: number;
};

export type ResponseFormInput = {
  /** The intake (nabór) this record belongs to, e.g. 2026 for Ogłoszenie 13/2026. */
  intakeYear: number;
  hasPolishCitizenship: boolean;
  rankingCountry: string;
  schoolCountry: string;
  scholarshipTrack: ScholarshipTrack;
  studyRoute: StudyRoute;
  /** Partner university with a NAWA framework agreement; required on both study routes. */
  targetUniversity?: string;
  /** ISCED-F detailed field code (see shared/study-fields.ts) or "other". */
  studyField: string;
  /**
   * City the preparatory course was assigned to (shared/prep-course-cities.ts) or "other". Only for
   * `preparatory_course` applicants whose outcome is `scholarship_awarded`.
   */
  prepCourseCity?: string;
  gradeBasis: GradeBasis;
  applicantKind: ApplicantKind;
  averageGrade: number;
  maximumGrade: number;
  polishSchoolLevel?: PolishSchoolLevel;
  currentStatus: ApplicationStatus;
  statusChangedAt: string;
};

/**
 * The comparison cohort is the applicant's country of citizenship; country groups and the whole track are no
 * longer used for the score comparison (ADR 0015).
 */
export const cohortScopes = ['country'] as const;
export type CohortScope = (typeof cohortScopes)[number];

export type StatisticsResult = {
  detailsAvailable: boolean;
  totalValidResponses: number;
  sameTrackCount: number;
  /** Valid surveys of the applicant's country of citizenship on the same track and intake, with no floor. */
  sameCountryCount: number;
  /** The country cohort size when `detailsAvailable`; 0 otherwise. */
  groupResponseCount: number;
  medianScore: number | null;
  lowerScorePercentage: number | null;
  rankPosition: number | null;
  rankTotal: number | null;
  /** Always null: the whole-track median is no longer computed (ADR 0015). */
  trackWideMedian: null;
  /** Sixteen fine bucket counts for the cohort score distribution (low → high). */
  scoreBuckets: number[] | null;
  /** The applicant's country of citizenship, or null when `detailsAvailable` is false. */
  cohortScope: CohortScope | null;
  /** Always null: pooled country groups are no longer used for the score comparison (ADR 0015). */
  cohortGroupId: null;
};

/** The landing counter: valid responses of the active intake, hidden below the cohort floor. */
export type IntakeSummaryResult = {
  intakeYear: number;
  /** Null when the intake has fewer valid responses than `MIN_COHORT_SIZE`. */
  responseCount: number | null;
};

export type CreateResponseRequest = {
  response: ResponseFormInput;
};

export type UpdateResponseRequest = {
  response: ResponseFormInput;
};

export type CreateResponseResult = {
  created: true;
  statistics: StatisticsResult;
};

export type UpdateResponseResult = {
  updated: true;
  statistics: StatisticsResult;
};

export type CurrentResponseResult = {
  response: ResponseFormInput;
};

export type DeleteResponseResult = {
  deleted: true;
};

/**
 * The answers of the scholarship-holder survey (ADR 0012). Exactly one of `programmeId` (the catalogue
 * kierunek) and `customProgramme` (typed by hand, private to its author) is present; `prepCentreId` is present
 * exactly on the preparatory path. The score snapshot and the ISCED-F code are set by the server, never sent.
 */
export type ScholarshipReportInput = {
  studyRoute: StudyRoute;
  /** A 2026 centre from `shared/prep-course-centres.ts`; only on the preparatory path. */
  prepCentreId?: string;
  /** A programme id from `shared/study-programmes.ts`. */
  programmeId?: string;
  /** Typed instead of a catalogue programme; 1-80 characters, single line. */
  customProgramme?: string;
  /** A partner university of the `nawa_director` track (`shared/universities.ts`). */
  universityId: string;
};

export type ScholarshipReport = ScholarshipReportInput & {
  /** The catalogue name of `programmeId`, resolved by the server; absent for a typed kierunek. */
  programmeName?: string;
  /** The survey's `nawa_orientation_score` when the report was last created or edited. */
  scoreSnapshot: number;
};

export type CreateScholarshipReportRequest = {
  report: ScholarshipReportInput;
};

export type UpdateScholarshipReportRequest = {
  report: ScholarshipReportInput;
};

/** `GET /api/scholarship-report`: the caller's report, or null when they have not answered. */
export type ScholarshipReportResult = {
  report: ScholarshipReport | null;
};

export type ScholarshipReportMutationResult = {
  report: ScholarshipReport;
};

export type DeleteScholarshipReportResult = {
  deleted: true;
};

export type ScholarshipReportSummaryCountry = {
  /** ISO 3166-1 alpha-2 code of the survey's `ranking_country`. */
  country: string;
  count: number;
};

export type ScholarshipReportSummaryPath = {
  route: StudyRoute;
  count: number;
};

export type ScholarshipReportSummaryCentre = {
  /** A 2026 centre from `shared/prep-course-centres.ts`. */
  centreId: string;
  count: number;
};

export type ScholarshipReportSummaryProgramme = {
  programmeId: string;
  /** The catalogue name, resolved by the server. */
  programmeName: string;
  count: number;
};

export type ScholarshipReportSummaryField = {
  /** Two-digit ISCED-F broad group from `shared/study-fields.ts`, or "other". */
  group: string;
  count: number;
  programmes: ScholarshipReportSummaryProgramme[];
};

export type ScholarshipReportSummaryUniversity = {
  universityId: string;
  count: number;
};

/**
 * The contributors-only results page (ADR 0016). Every count is shown from one; reports of suspicious surveys are
 * excluded. `countries` always lists every country with a counted report, even when the lists are filtered to one
 * country, so the filter can switch back without another request.
 */
export type ScholarshipReportSummary = {
  total: number;
  countries: ScholarshipReportSummaryCountry[];
  paths: ScholarshipReportSummaryPath[];
  centres: ScholarshipReportSummaryCentre[];
  fields: ScholarshipReportSummaryField[];
  /** Reports whose kierunek was typed by hand; their text never travels in the summary. */
  typedProgrammeCount: number;
  universities: ScholarshipReportSummaryUniversity[];
};

/**
 * The `ориентир 2026` (ADR 0017): the lowest score snapshot among the counted 2026 Director holder reports of
 * the caller's citizenship country, with their number. Only numbers travel — never an identity, a survey id or
 * another report field. The score list comes only with the full distribution, for the holder dots.
 */
export type OrientationMarkResult = {
  /** Null when no counted holder report exists in the country. */
  mark: number | null;
  /** The number of counted holder reports behind the mark; shown from one. */
  n: number;
  /** Holder score snapshots, ascending; present only when the client also holds the full distribution. */
  scores?: number[];
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    /** ISO 8601 UTC instant when a blocked action becomes possible again; only EDIT_LIMIT_REACHED. */
    retryAt?: string;
  };
};
