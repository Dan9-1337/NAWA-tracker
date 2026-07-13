export const scholarshipTracks = ['nawa_mnisw', 'minister_health', 'minister_culture'] as const;
export type ScholarshipTrack = (typeof scholarshipTracks)[number];

export const studyRoutes = ['preparatory_course', 'direct_studies'] as const;
export type StudyRoute = (typeof studyRoutes)[number];

export const studyTypes = ['first_cycle', 'uniform_masters'] as const;
export type StudyType = (typeof studyTypes)[number];

export const choicePriorities = ['first_choice', 'second_choice', 'other'] as const;
export type ChoicePriority = (typeof choicePriorities)[number];

export const applicationStatuses = [
  'submitted',
  'under_review',
  'documents_requested',
  'waiting_for_decision',
  'positive_decision',
  'negative_decision',
] as const;
export type ApplicationStatus = (typeof applicationStatuses)[number];

export type GradeScaleInput = 5 | 10 | 12 | 20 | 100 | 'custom';

export type ResponseFormInput = {
  scholarshipTrack: ScholarshipTrack;
  studyRoute: StudyRoute;
  studyType: StudyType;
  country: string;
  gradeScale: GradeScaleInput;
  customGradeScale?: number;
  gradeValue: number;
  university: string;
  studyField: string;
  choicePriority: ChoicePriority;
  applicationStatus: ApplicationStatus;
  decisionDate?: string | null;
};

export type ComparisonGroup =
  | 'track-route-type-university-field'
  | 'track-route-type-university'
  | 'track-route-type';

export type StatisticsResult = {
  detailsAvailable: boolean;
  group: ComparisonGroup | null;
  totalValidResponses: number;
  sameTrackCount: number;
  sameUniversityCount: number | null;
  sameUniversityAndFieldCount: number | null;
  groupResponseCount: number;
  medianGradePercentage: number | null;
  lowerGradePercentage: number | null;
  waitingForDecisionCount: number | null;
  positiveDecisionCount: number | null;
  negativeDecisionCount: number | null;
};

export type CreateResponseRequest = {
  response: ResponseFormInput;
  turnstileToken: string;
};

export type UpdateResponseRequest = {
  response: ResponseFormInput;
};

export type RestoreSessionRequest = {
  recoveryToken: string;
  turnstileToken: string;
};

export type RecoveryCredential = {
  recoveryToken: string;
  recoveryUrl: string;
};

export type CreateResponseResult = RecoveryCredential & {
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

export type RestoreSessionResult = CurrentResponseResult;

export type LogoutSessionResult = {
  loggedOut: true;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
  };
};
