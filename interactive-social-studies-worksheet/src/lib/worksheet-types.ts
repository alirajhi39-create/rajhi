export type QuestionType = "mcq" | "truefalse" | "matching" | "ordering" | "fill";

export interface MatchItem {
  id: string;
  text: string;
}

export interface OrderItem {
  id: string;
  text: string;
  caption?: string;
}

export type FillSegment = { kind: "text"; value: string } | { kind: "blank"; id: string };

interface QuestionBase {
  id: string;
  type: QuestionType;
  points: number;
  prompt: string;
  hint?: string;
}

export interface PublicMcqQuestion extends QuestionBase {
  type: "mcq";
  options: string[];
}

export interface PublicTrueFalseQuestion extends QuestionBase {
  type: "truefalse";
}

export interface PublicMatchingQuestion extends QuestionBase {
  type: "matching";
  left: MatchItem[];
  right: MatchItem[];
}

export interface PublicOrderingQuestion extends QuestionBase {
  type: "ordering";
  items: OrderItem[];
}

export interface PublicFillQuestion extends QuestionBase {
  type: "fill";
  segments: FillSegment[];
  bank: string[];
}

export type PublicQuestion =
  | PublicMcqQuestion
  | PublicTrueFalseQuestion
  | PublicMatchingQuestion
  | PublicOrderingQuestion
  | PublicFillQuestion;

export interface PublicSection {
  id: string;
  order: string;
  title: string;
  instruction: string;
  icon: string;
  points: number;
  questions: PublicQuestion[];
}

export interface PublicWorksheet {
  subject: string;
  grade: string;
  classroom: string;
  unit: string;
  lesson: string;
  term: string;
  maxScore: number;
  objectives: string[];
  sections: PublicSection[];
}

/** إجابات الطالب */
export type AnswerValue =
  | { type: "mcq"; value: number | null }
  | { type: "truefalse"; value: boolean | null }
  | { type: "matching"; value: Record<string, string> }
  | { type: "ordering"; value: string[] }
  | { type: "fill"; value: Record<string, string> };

export type AnswersMap = Record<string, AnswerValue>;

export interface QuestionResult {
  questionId: string;
  sectionId: string;
  type: QuestionType;
  prompt: string;
  points: number;
  earned: number;
  correct: boolean;
  studentAnswerText: string;
  correctAnswerText: string;
  explanation?: string;
}

export interface GradeResult {
  breakdown: QuestionResult[];
  totalScore: number;
  maxScore: number;
  correctCount: number;
  questionCount: number;
}
