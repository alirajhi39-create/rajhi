import { desc } from "drizzle-orm";
import { db } from "@/db";
import { submissions } from "@/db/schema";
import { isTeacherAuthed, unauthorized } from "@/lib/teacher-auth";
import { MAX_SCORE, gradeSubmission } from "@/lib/worksheet";
import type { AnswersMap } from "@/lib/worksheet-types";

export const dynamic = "force-dynamic";

interface SubmitBody {
  studentName?: unknown;
  studentClass?: unknown;
  schoolName?: unknown;
  teacherName?: unknown;
  answers?: unknown;
  durationSeconds?: unknown;
}

function asText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

export async function POST(request: Request) {
  let body: SubmitBody;
  try {
    body = (await request.json()) as SubmitBody;
  } catch {
    return Response.json({ ok: false, error: "صيغة الطلب غير صحيحة" }, { status: 400 });
  }

  const studentName = asText(body.studentName);
  if (studentName.length < 2) {
    return Response.json({ ok: false, error: "الرجاء كتابة اسم الطالب كاملاً" }, { status: 400 });
  }

  const answers = (body.answers ?? {}) as AnswersMap;
  if (typeof answers !== "object" || Array.isArray(answers)) {
    return Response.json({ ok: false, error: "الإجابات غير صالحة" }, { status: 400 });
  }

  const result = gradeSubmission(answers);
  const durationSeconds = Math.max(
    0,
    Math.min(60 * 60 * 5, Number(body.durationSeconds) || 0),
  );

  const [row] = await db
    .insert(submissions)
    .values({
      studentName,
      studentClass: asText(body.studentClass, "6/2") || "6/2",
      schoolName: asText(body.schoolName) || null,
      teacherName: asText(body.teacherName) || null,
      answers,
      breakdown: result.breakdown,
      autoScore: result.totalScore,
      essayScore: 0,
      totalScore: result.totalScore,
      maxScore: MAX_SCORE,
      correctCount: result.correctCount,
      durationSeconds: Math.round(durationSeconds),
    })
    .returning();

  return Response.json({
    ok: true,
    submissionId: row.id,
    sentAt: row.createdAt,
    result,
  });
}

export async function GET(request: Request) {
  if (!(await isTeacherAuthed(request))) return unauthorized();

  const rows = await db.select().from(submissions).orderBy(desc(submissions.createdAt));

  const count = rows.length;
  const average =
    count > 0 ? rows.reduce((sum, r) => sum + r.totalScore, 0) / count : 0;
  const highest = count > 0 ? Math.max(...rows.map((r) => r.totalScore)) : 0;
  const lowest = count > 0 ? Math.min(...rows.map((r) => r.totalScore)) : 0;
  const passed = rows.filter((r) => r.totalScore >= MAX_SCORE / 2).length;

  return Response.json({
    ok: true,
    stats: {
      count,
      average: Math.round(average * 10) / 10,
      highest,
      lowest,
      passed,
      maxScore: MAX_SCORE,
    },
    submissions: rows,
  });
}
