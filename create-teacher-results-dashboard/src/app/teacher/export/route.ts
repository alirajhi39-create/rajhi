import { isTeacherAuthedRequest } from "@/lib/auth";
import { buildCsv, csvResponse } from "@/lib/csv";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/** مسار تصدير بديل خارج /api — يعمل عبر نفس آلية التحقق (رمز/كوكي/كلمة مرور) */
export async function GET(req: NextRequest) {
  if (!(await isTeacherAuthedRequest(req))) {
    return Response.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const type = req.nextUrl.searchParams.get("type") ?? "attempts";
  const { csv, filename } = await buildCsv(type);
  return csvResponse(csv, filename);
}
