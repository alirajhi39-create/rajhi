import { db } from "@/db";
import { attempts } from "@/db/schema";
import { isTeacherAuthedRequest } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await isTeacherAuthedRequest(req))) {
    return Response.json({ ok: false, error: "غير مصرّح" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!id) return Response.json({ ok: false, error: "معرّف ناقص" }, { status: 400 });
  const deleted = await db.delete(attempts).where(eq(attempts.id, id)).returning({ id: attempts.id });
  if (!deleted.length) {
    return Response.json({ ok: false, error: "لا توجد محاولة بهذا المعرّف" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
