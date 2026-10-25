import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export type AnswerRecord = {
  /** رقم السؤال (0-based) حسب ترتيب أسئلة الدرس الأصلي */
  qi: number;
  /** موضع الخيار الذي اختاره الطالب بعد الخلط، أو -1 إذا كشف الإجابة دون اختيار */
  pos: number;
  /** الفهرس الأصلي للخيار المختار (0 = الإجابة الصحيحة) */
  picked: number;
  /** هل أجاب إجابة صحيحة؟ */
  ok: boolean;
  /** هل ضغط زر «اكشف الإجابة»؟ */
  revealed: boolean;
  /** هل تخطّى السؤال دون إجابة؟ */
  skipped?: boolean;
  /** الزمن المستغرق في السؤال بالمللي ثانية */
  ms: number;
  /** النقاط المكتسبة (100 + مكافأة السرعة، أو 0) */
  got: number;
};

/** محاولة طالب واحدة في اختبار درس التيمم */
export const attempts = pgTable("attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentName: text("student_name").notNull(),
  studentClass: text("student_class").notNull().default(""),
  correct: integer("correct").notNull().default(0),
  total: integer("total").notNull().default(0),
  score: integer("score").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
  revealedCount: integer("revealed_count").notNull().default(0),
  answers: jsonb("answers").$type<AnswerRecord[]>().notNull().default([]),
  device: text("device").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Attempt = typeof attempts.$inferSelect;
export type NewAttempt = typeof attempts.$inferInsert;
