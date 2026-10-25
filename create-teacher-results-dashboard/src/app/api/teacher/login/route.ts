import { setTeacherCookie, teacherPassword, tokenFor } from "@/lib/auth";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { password?: unknown } = {};
  try {
    body = (await req.json()) as { password?: unknown };
  } catch {
    /* تجاهل */
  }
  const password = String(body.password ?? "");
  if (!password || password !== teacherPassword()) {
    return Response.json({ ok: false, error: "كلمة المرور غير صحيحة" }, { status: 401 });
  }
  await setTeacherCookie();
  // رمز الجلسة يُحفظ في متصفح المعلم ويُرسل مع كل طلب (يعمل حتى لو حُجبت الكوكيز)
  return Response.json({ ok: true, token: tokenFor(password) });
}
