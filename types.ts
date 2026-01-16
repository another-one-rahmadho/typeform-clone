export enum QuestionType {
  TEXT = 'text',
  MULTIPLE_CHOICE = 'multiple_choice',
  CHECKBOX = 'checkbox',
  DROPDOWN = 'dropdown',
  EMAIL = 'email',
  PHONE = 'phone',
  RATING = 'rating',
  OPINION_SCALE = 'opinion_scale', // NPS 0-10
  MATRIX = 'matrix', // Grid choice
  DATE = 'date',
  TIME = 'time',
  SIGNATURE = 'signature',
  FILE = 'file',
  GROUP = 'group',
}

export interface ValidationRules {
  minLength?: number;
  maxLength?: number;
  pattern?: string; // Regex string
  min?: number;
  max?: number;
  allowedFileTypes?: string[]; // e.g., ['.pdf', 'image/*']
  maxFileSizeMB?: number;
  customErrorMessage?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  required: boolean;
  validation?: ValidationRules; // New validation rules
  options?: string[]; // For choice/dropdown
  rows?: string[]; // For Matrix
  columns?: string[]; // For Matrix
  ratingMax?: number; // For Rating (default 5)
  subQuestions?: Question[]; // For group type
  repeatable?: boolean; // For group type
  maxRepeats?: number; // For group type
  points?: number; // For quiz mode
  correctAnswer?: string | string[]; // For quiz mode
  isLocked?: boolean; // If true, prevents randomization of this question's position
}

export type FormLayout = 'step' | 'scroll';
export type FormMode = 'quiz' | 'survey';

export interface FormTheme {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  logoUrl?: string;
  coverImageUrl?: string;
}

export interface FormSettings {
  timeLimit?: number; // in minutes
  allowBackNavigation: boolean;
  showProgressBar: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  enableReview?: boolean; // Toggle for showing results/review button
}

export interface WelcomeScreen {
  title: string;
  description: string;
  buttonText: string;
}

export interface Form {
  id: string;
  title: string;
  description: string;
  welcomeScreen?: WelcomeScreen;
  mode: FormMode;
  layout: FormLayout;
  questions: Question[];
  createdAt: number;
  theme: FormTheme;
  settings: FormSettings;
  // Analytics
  views: number;
  submissionCount: number;
  avgCompletionTime: number; // in seconds
}

export type AnswerValue = string | string[] | number | File | null | Record<string, any>[] | Record<string, string>;

export interface FormSubmission {
  id: string;
  formId: string;
  answers: Record<string, AnswerValue>;
  submittedAt: number;
  score?: number;
  maxScore?: number;
  timeTaken?: number; // in seconds
}