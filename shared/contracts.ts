export const scholarshipTracks = ['nawa_director', 'health_minister', 'culture_minister'] as const;
export type ScholarshipTrack = (typeof scholarshipTracks)[number];

export const studyRoutes = ['preparatory_course', 'direct_studies'] as const;
export type StudyRoute = (typeof studyRoutes)[number];

export const polishSchoolLevels = ['none', 'primary', 'secondary'] as const;
export type PolishSchoolLevel = (typeof polishSchoolLevels)[number];

export const applicationStatuses = [
  'submitted',
  'formal_review_in_progress',
  'correction_requested',
  'formal_review_completed',
  'merit_review_in_progress',
  'merit_review_positive',
  'merit_review_negative',
  'awaiting_decision',
  'scholarship_awarded',
  'scholarship_not_awarded',
] as const;
export type ApplicationStatus = (typeof applicationStatuses)[number];

export const terminalApplicationStatuses = [
  'merit_review_negative',
  'scholarship_awarded',
  'scholarship_not_awarded',
] as const;

export type ResponseFormInput = {
  hasPolishCitizenship: boolean;
  rankingCountry: string;
  schoolCountry: string;
  scholarshipTrack: ScholarshipTrack;
  studyRoute: StudyRoute;
  averageGrade: number;
  maximumGrade: number;
  polishSchoolLevel?: PolishSchoolLevel;
  currentStatus: ApplicationStatus;
  statusChangedAt: string;
};

export const comparisonGroups = ['track-country', 'track'] as const;
export type ComparisonGroup = (typeof comparisonGroups)[number];

export type StatusCounts = Record<ApplicationStatus, number>;

export type StatisticsResult = {
  detailsAvailable: boolean;
  group: ComparisonGroup | null;
  totalValidResponses: number;
  sameTrackCount: number;
  sameCountryCount: number | null;
  groupResponseCount: number;
  medianScore: number | null;
  lowerScorePercentage: number | null;
  statusCounts: StatusCounts | null;
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

export type ApiError = {
  error: {
    code: string;
    message: string;
  };
};
