import { clearTeacherCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearTeacherCookie();
  return Response.json({ ok: true });
}
