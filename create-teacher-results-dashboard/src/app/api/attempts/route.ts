import { db } from "@/db";
import { attempts, type AnswerRecord } from "@/db/schema";
import { isTeacherAuthedRequest } from "@/lib/auth";
import { QUESTIONS } from "@/lib/lesson";
import { getTeacherData } from "@/lib/teacherData";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

type RawAnswer = Partial<AnswerRecord> & Record<string, unknown>;

function normalizeAnswers(input: unknown) {
  const qCount = QUESTIONS.length;
  const list: RawAnswer[] = Array.isArray(input) ? (input as RawAnswer[]) : [];
  const seen = new Set<number>();
  const clean: AnswerRecord[] = [];
  let correct = 0;
  let score = 0;
  let revealedCount = 0;

  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const qi = Number(raw.qi);
    if (!Number.isInteger(qi) || qi < 0 || qi >= qCount || seen.has(qi)) continue;
    seen.add(qi);

    const pickedRaw = Number(raw.picked);
    const posRaw = Number(raw.pos);
    const picked = Number.isInteger(pickedRaw) ? clamp(pickedRaw, -1, 9) : -1;
    const pos = Number.isInteger(posRaw) ? clamp(posRaw, -1, 9) : -1;
    const revealed = picked === -1 && !!raw.revealed;
    const skipped = picked === -1 && !revealed;
    const ok = picked === 0;
    const ms = clamp(Number(raw.ms) || 0, 0, 3_600_000);
    const got = ok ? clamp(Number(raw.got) || 0, 100, 150) : 0;

    if (ok) {
      correct += 1;
      score += got;
    }
    if (revealed) revealedCount += 1;

    clean.push({ qi, pos, picked, ok, revealed, skipped, ms, got });
  }

  clean.sort((a, b) => a.qi - b.qi);
  return { clean, correct, score, revealedCount, answered: clean.length };
}

/** حفظ نتيجة طالب بعد إنهاء الأسئلة */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "طلب غير صالح" }, { status: 400 });
  }

  const studentName = String(body.studentName ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  const studentClass = String(body.studentClass ?? "").trim().slice(0, 40);
  if (studentName.length < 2) {
    return Response.json(
      { ok: false, error: "اسم الطالب مطلوب (حرفان على الأقل)" },
      { status: 400 },
    );
  }

  const { clean, correct, score, revealedCount, answered } = normalizeAnswers(body.answers);
  const total = QUESTIONS.length;
  if (answered < total) {
    return Response.json({ ok: false, error: "يجب الإجابة عن جميع الأسئلة" }, { status: 400 });
  }

  const durationMs = clamp(Number(body.durationMs) || 0, 0, 3_600_000);
  const device = String(body.device ?? "").trim().slice(0, 120);

  const [row] = await db
    .insert(attempts)
    .values({
      studentName,
      studentClass,
      correct,
      total,
      score,
      durationMs,
      revealedCount,
      answers: clean,
      device,
    })
    .returning({ id: attempts.id });

  return Response.json({ ok: true, id: row.id, correct, total, score });
}

/** لوحة المعلم: النتائج والإحصاءات */
export async function GET(req: NextRequest) {
  if (!(await isTeacherAuthedRequest(req))) {
    return Response.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const data = await getTeacherData({
    q: sp.get("q") ?? "",
    cls: sp.get("class") ?? "",
    range: sp.get("range") ?? "all",
    sort: sp.get("sort") ?? "new",
    limit: Number(sp.get("limit")) || 500,
  });

  return Response.json({ ok: true, ...data });
}
