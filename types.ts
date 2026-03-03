export enum QuestionType {
  MultipleChoice = 'MULTIPLE_CHOICE',
  ShortAnswer = 'SHORT_ANSWER',
  Essay = 'ESSAY',
  FillInTheBlank = 'FILL_IN_THE_BLANK',
  Matching = 'MATCHING',
  TrueFalse = 'TRUE_FALSE',
  Table = 'TABLE',
  Sequencing = 'SEQUENCING', // New: Drag and drop ordering
  MultiSelect = 'MULTI_SELECT', // New: Checkbox multiple correct answers
  Classification = 'CLASSIFICATION', // New: Drag items to categories
  ImageHotspot = 'IMAGE_HOTSPOT', // New: Click on an image area
  DropdownFill = 'DROPDOWN_FILL', // New: Fill blank from dropdown
  Unknown = 'UNKNOWN',
}

export interface Question {
  id: number;
  originalNumber?: string;
  questionText: string;
  type: QuestionType;
  options?: string[]; // For MULTIPLE_CHOICE, TRUE_FALSE, MULTI_SELECT
  prompts?: string[]; // For MATCHING
  matches?: string[]; // For MATCHING
  headers?: string[]; // For TABLE
  rows?: number; // For TABLE
  sequencingItems?: string[]; // For SEQUENCING
  classificationCategories?: string[]; // For CLASSIFICATION
  classificationItems?: string[]; // For CLASSIFICATION
  imageUrl?: string; // For IMAGE_HOTSPOT
  imageDescription?: string; // For IMAGE_HOTSPOT accessibility
  dropdownText?: string; // For DROPDOWN_FILL e.g. "The capital of France is [BLANK]."
  dropdownOptions?: string[]; // For DROPDOWN_FILL
  subQuestions?: Question[]; // For nested questions
}

export interface Quiz {
  title: string;
  contextualText?: string;
  questions: Question[];
}

export interface UserAnswers {
  [questionId: number]: any; // Can be string, object, array, or nested object for sub-questions
}

export type GradingState = 'idle' | 'grading' | 'graded';

export interface GradedResult {
  questionId: number;
  isCorrect: boolean;
  correctAnswer?: any; // Can be string, or a JSON string for complex types
  explanation: string;
  subResults?: GradedResult[]; // For nested questions
}

export interface QuizResult {
  isCorrect: boolean;
  correctAnswer?: any;
  explanation: string;
  subResults?: QuizResults; // For nested questions
}

export interface QuizResults {
  [questionId: number]: QuizResult;
}

export interface ReviewData {
  reviewLesson: string;
  practiceQuiz: Quiz;
}

declare global {
  interface Window {
    aistudio: {
      openSelectKey: () => Promise<void>;
      hasSelectedApiKey: () => Promise<boolean>;
    };
  }
}