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

export const terminalApplicationStatuses = [
  'merit_review_negative',
  'scholarship_awarded',
  'scholarship_not_awarded',
] as const;

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

export const cohortScopes = ['country', 'group', 'track'] as const;
export type CohortScope = (typeof cohortScopes)[number];

export type StatisticsResult = {
  detailsAvailable: boolean;
  totalValidResponses: number;
  sameTrackCount: number;
  sameCountryCount: number | null;
  groupResponseCount: number;
  medianScore: number | null;
  lowerScorePercentage: number | null;
  rankPosition: number | null;
  rankTotal: number | null;
  trackWideMedian: number | null;
  /** Sixteen fine bucket counts for the cohort score distribution (low → high). */
  scoreBuckets: number[] | null;
  /** Which tier of country -> country group -> track the comparison cohort resolved to. */
  cohortScope: CohortScope | null;
  /** Id of the pooled country group when `cohortScope` is 'group'. */
  cohortGroupId: string | null;
};

/**
 * Outcomes reported by people in the caller's cohort. Disclosed from three awarded responses;
 * scores are rounded outward to 5-point bands so no applicant's own score is exposed.
 */
export type CohortOutcomesResult = {
  ownCountry: string;
  /** Null until some tier of the ladder has enough awarded responses to disclose. */
  scope: CohortScope | null;
  groupId: string | null;
  awardedCount: number;
  notAwardedCount: number;
  /** Awarded / (awarded + not awarded) among merit-positive responses. */
  awardedRate: number | null;
  awardedBandLow: number | null;
  awardedBandHigh: number | null;
  /** Upper band of scores that passed merit but got no seat; needs three such reports. */
  notAwardedBandHigh: number | null;
};

export const fieldLevels = ['detailed', 'narrow', 'broad', 'all'] as const;
export type FieldLevel = (typeof fieldLevels)[number];

/**
 * Where reporters in the caller's study field were sent for the preparatory course. `level` is how far the field
 * had to be widened to reach the disclosure floor (null: nothing can be shown yet). Cities below the floor are
 * merged into `otherCount`.
 */
export type PrepCityDistribution = {
  studyField: string;
  level: FieldLevel | null;
  /** ISCED-F code of the group at `level`: 4, 3 or 2 digits, null for "all". */
  groupCode: string | null;
  total: number;
  cities: Array<{ city: string; count: number }>;
  otherCount: number;
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

export type ApiError = {
  error: {
    code: string;
    message: string;
  };
};
