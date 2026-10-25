import { db } from "@/db";
import { attempts, type AnswerRecord } from "@/db/schema";
import { QUESTIONS } from "@/lib/lesson";
import type { TeacherFilters, TeacherPayload } from "@/lib/teacherTypes";
import { and, asc, desc, eq, gte, ilike, sql, type SQL } from "drizzle-orm";

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** يجلب نتائج الطلاب والإحصاءات — يُستخدم من واجهة الـAPI ومن صفحة لوحة المعلم مباشرة */
export async function getTeacherData(f: TeacherFilters = {}): Promise<TeacherPayload> {
  const q = (f.q ?? "").trim();
  const cls = (f.cls ?? "").trim();
  const range = f.range ?? "all";
  const sort = f.sort ?? "new";
  const limit = clamp(Number(f.limit) || 500, 1, 2000);

  const conds = [];
  if (q) conds.push(ilike(attempts.studentName, `%${q}%`));
  if (cls) conds.push(eq(attempts.studentClass, cls));
  if (range === "today") conds.push(gte(attempts.createdAt, sql`date_trunc('day', now())`));
  else if (range === "week") conds.push(gte(attempts.createdAt, sql`now() - interval '7 days'`));
  else if (range === "month") conds.push(gte(attempts.createdAt, sql`now() - interval '30 days'`));

  const where = conds.length ? and(...conds) : undefined;

  let orderBy: SQL<unknown>[];
  if (sort === "old") orderBy = [asc(attempts.createdAt)];
  else if (sort === "best") orderBy = [desc(attempts.correct), desc(attempts.score)];
  else if (sort === "worst") orderBy = [asc(attempts.correct), asc(attempts.score)];
  else orderBy = [desc(attempts.createdAt)];

  const rows = await db
    .select()
    .from(attempts)
    .where(where)
    .orderBy(...orderBy)
    .limit(limit);

  const classesRows = await db
    .select({ name: attempts.studentClass, n: sql<number>`count(*)::int` })
    .from(attempts)
    .groupBy(attempts.studentClass)
    .orderBy(desc(sql`count(*)`));

  const total = rows.length;
  const students = new Set(
    rows.map((r) => `${r.studentName.trim().toLowerCase()}|${r.studentClass}`),
  ).size;
  const correctSum = rows.reduce((s, r) => s + r.correct, 0);
  const totalSum = rows.reduce((s, r) => s + r.total, 0);

  const perQuestion = QUESTIONS.map((qq, qi) => {
    let n = 0;
    let okCount = 0;
    let revealed = 0;
    let msSum = 0;
    const wrongPicks: Record<number, number> = {};
    for (const r of rows) {
      const a = (r.answers as AnswerRecord[] | null)?.find((x) => x.qi === qi);
      if (!a) continue;
      n += 1;
      msSum += a.ms || 0;
      if (a.ok) okCount += 1;
      else if (a.revealed) revealed += 1;
      else if (a.picked >= 0) wrongPicks[a.picked] = (wrongPicks[a.picked] || 0) + 1;
    }
    const top = Object.entries(wrongPicks).sort((a, b) => b[1] - a[1])[0]?.[0];
    return {
      qi,
      text: qq.q,
      correctText: qq.a[0],
      attempts: n,
      correct: okCount,
      revealed,
      pct: n ? Math.round((okCount / n) * 100) : 0,
      avgMs: n ? Math.round(msSum / n / 1000) : 0,
      topWrongIndex: top === undefined ? -1 : Number(top),
      topWrongText: top === undefined ? "" : (qq.a[Number(top)] ?? ""),
      topWrongCount: top === undefined ? 0 : wrongPicks[Number(top)],
    };
  });

  return {
    rows,
    stats: {
      total,
      students,
      avgPct: totalSum ? Math.round((correctSum / totalSum) * 100) : 0,
      bestScore: rows.reduce((m, r) => Math.max(m, r.score), 0),
      passed: rows.filter((r) => r.total > 0 && r.correct / r.total >= 0.6).length,
      excellent: rows.filter((r) => r.total > 0 && r.correct / r.total >= 0.85).length,
      avgDuration: rows.length
        ? Math.round(rows.reduce((s, r) => s + r.durationMs, 0) / rows.length / 1000)
        : 0,
      questions: QUESTIONS.length,
    },
    perQuestion,
    classes: classesRows.map((c) => ({
      name: c.name || "(بدون صف)",
      value: c.name,
      n: c.n,
    })),
  };
}
