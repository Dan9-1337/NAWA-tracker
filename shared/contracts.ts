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
] as const;
export type ApplicationStatus = (typeof applicationStatuses)[number];

export const terminalApplicationStatuses = ['merit_review_negative', 'scholarship_awarded'] as const;

export type ScoreBreakdown = {
  gradesScore: number;
  polishSchoolBonus: number;
  total: number;
};

export type ResponseFormInput = {
  hasPolishCitizenship: boolean;
  rankingCountry: string;
  schoolCountry: string;
  scholarshipTrack: ScholarshipTrack;
  studyRoute: StudyRoute;
  /** Required for direct_studies; partner university with a NAWA framework agreement. */
  targetUniversity?: string;
  averageGrade: number;
  maximumGrade: number;
  polishSchoolLevel?: PolishSchoolLevel;
  currentStatus: ApplicationStatus;
  statusChangedAt: string;
};

export type StatisticsGrowth7d = {
  newResponsesTotal: number;
  newResponsesInGroup: number;
  medianThen: number | null;
  medianNow: number | null;
  percentileThen: number | null;
  percentileNow: number | null;
  trackNewResponses: number;
  trackMedianThen: number | null;
  trackMedianNow: number | null;
  statusUpdatesInGroup: number;
};

export type GlobalBenchmark = {
  sampleSize: number | null;
  representedCountryCount: number | null;
  median: number | null;
  scoreDelta: number | null;
  lowerScorePercentage: number | null;
  scoreBuckets: number[] | null;
  detailedCountriesCount: number | null;
};

export type CountryContextStats = {
  countryMedian: number | null;
  countrySampleSize: number;
  countryShareOfTrack: number | null;
  medianDeltaVsGlobal: number | null;
  distributionStable: boolean | null;
  nearbyScoreCount: number | null;
};

export type StatisticsHistoryPoint = {
  recordedAt: string;
  lowerScorePercentage: number | null;
  groupResponseCount: number;
  rankPosition: number | null;
};

export type GroupProgress = {
  submitted: number;
  formalPositive: number;
  meritPositive: number;
  scholarshipAwarded: number;
};

export type ReportedMeritOutcomeStats = {
  positiveCount: number;
  negativeCount: number;
  lowestReportedPositiveScore: number | null;
  highestReportedNegativeScore: number | null;
  boundaryState: 'insufficient_data' | 'positive_only' | 'interval' | 'overlapping_results';
};

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
  gradesScore: number | null;
  polishSchoolBonus: number | null;
  trackWideMedian: number | null;
  /** Sixteen fine bucket counts for the cohort score distribution (low → high). */
  scoreBuckets: number[] | null;
  cohortScores: number[] | null;
  growth7d: StatisticsGrowth7d | null;
  history: StatisticsHistoryPoint[];
  groupProgress: GroupProgress | null;
  reportedMeritOutcomes: ReportedMeritOutcomeStats | null;
  globalBenchmark: GlobalBenchmark;
  countryContext: CountryContextStats;
};

export type PublicStatisticsRequest = {
  scholarshipTrack: ScholarshipTrack;
  rankingCountry: string;
  averageGrade: number;
  maximumGrade: number;
  polishSchoolLevel?: PolishSchoolLevel;
};

export type PublicStatisticsResult = StatisticsResult;

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
