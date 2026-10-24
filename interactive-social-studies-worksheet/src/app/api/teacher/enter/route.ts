import { desc } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { submissions } from "@/db/schema";
import { TEACHER_COOKIE, getTeacherPasscode } from "@/lib/teacher-auth";
import { MAX_SCORE } from "@/lib/worksheet";

export const dynamic = "force-dynamic";

/**
 * دخول المعلم في طلب واحد: يتحقق من الرمز (في جسم الطلب — لا يعتمد على
 * الترويسة أو الكوكيز) ويعيد البيانات معاً. هذا يلغي الحاجة لطلب تالي قد
 * تُحجب ترويساته داخل إطار المعاينة.
 */
export async function POST(request: Request) {
  let passcode = "";
  try {
    const body = (await request.json()) as { passcode?: unknown };
    passcode = typeof body.passcode === "string" ? body.passcode.trim() : "";
  } catch {
    passcode = "";
  }

  if (!passcode || passcode !== getTeacherPasscode()) {
    return Response.json(
      { ok: false, error: "رمز الدخول غير صحيح — تأكّد من الرقم (٦ أرقام)" },
      { status: 401 },
    );
  }

  try {
    const store = await cookies();
    store.set(TEACHER_COOKIE, passcode, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
  } catch {
    /* قد يُمنع ضبط الكوكيز داخل المعاينة — نتجاهل */
  }

  const rows = await db.select().from(submissions).orderBy(desc(submissions.createdAt));

  const count = rows.length;
  const average = count > 0 ? rows.reduce((sum, r) => sum + r.totalScore, 0) / count : 0;
  const highest = count > 0 ? Math.max(...rows.map((r) => r.totalScore)) : 0;
  const lowest = count > 0 ? Math.min(...rows.map((r) => r.totalScore)) : 0;
  const passed = rows.filter((r) => r.totalScore >= MAX_SCORE / 2).length;

  return Response.json({
    ok: true,
    authed: true,
    storageKey: "tw_teacher_token",
    token: passcode,
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
