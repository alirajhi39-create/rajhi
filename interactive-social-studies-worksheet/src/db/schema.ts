import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * تخزين محاولات الطلاب لورقة العمل التفاعلية
 */
export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  studentName: varchar("student_name", { length: 120 }).notNull(),
  studentClass: varchar("student_class", { length: 40 }).notNull().default("6/2"),
  schoolName: varchar("school_name", { length: 160 }),
  teacherName: varchar("teacher_name", { length: 120 }),
  // إجابات الطالب الخام
  answers: jsonb("answers").notNull(),
  // تفاصيل التصحيح لكل سؤال
  breakdown: jsonb("breakdown").notNull(),
  autoScore: integer("auto_score").notNull().default(0),
  essayScore: integer("essay_score").notNull().default(0),
  totalScore: integer("total_score").notNull().default(0),
  maxScore: integer("max_score").notNull().default(20),
  correctCount: integer("correct_count").notNull().default(0),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  teacherReviewed: boolean("teacher_reviewed").notNull().default(false),
  teacherNote: text("teacher_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SubmissionRow = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
