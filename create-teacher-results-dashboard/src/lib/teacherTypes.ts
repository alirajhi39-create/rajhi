import type { Attempt } from "@/db/schema";

export type TeacherStats = {
  total: number;
  students: number;
  avgPct: number;
  bestScore: number;
  passed: number;
  excellent: number;
  avgDuration: number;
  questions: number;
};

export type PerQuestionStat = {
  qi: number;
  text: string;
  correctText: string;
  attempts: number;
  correct: number;
  revealed: number;
  pct: number;
  avgMs: number;
  topWrongIndex: number;
  topWrongText: string;
  topWrongCount: number;
};

export type ClassCount = { name: string; value: string; n: number };

export type TeacherPayload = {
  rows: Attempt[];
  stats: TeacherStats;
  perQuestion: PerQuestionStat[];
  classes: ClassCount[];
};

export type TeacherFilters = {
  q?: string;
  cls?: string;
  range?: string;
  sort?: string;
  limit?: number;
};
