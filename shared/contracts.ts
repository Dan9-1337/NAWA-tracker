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

export type ApiError = {
  error: {
    code: string;
    message: string;
    /** ISO 8601 UTC instant when a blocked action becomes possible again; only EDIT_LIMIT_REACHED. */
    retryAt?: string;
  };
};
