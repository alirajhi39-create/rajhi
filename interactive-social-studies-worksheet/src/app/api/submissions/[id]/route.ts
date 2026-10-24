import { eq } from "drizzle-orm";
import { db } from "@/db";
import { submissions } from "@/db/schema";
import { isTeacherAuthed, unauthorized } from "@/lib/teacher-auth";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  if (!(await isTeacherAuthed())) return unauthorized();
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) {
    return Response.json({ ok: false, error: "معرّف غير صالح" }, { status: 400 });
  }

  const [row] = await db.select().from(submissions).where(eq(submissions.id, numericId));
  if (!row) return Response.json({ ok: false, error: "غير موجود" }, { status: 404 });
  return Response.json({ ok: true, submission: row });
}

export async function PATCH(request: Request, { params }: Params) {
  if (!(await isTeacherAuthed())) return unauthorized();
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) {
    return Response.json({ ok: false, error: "معرّف غير صالح" }, { status: 400 });
  }

  let body: { teacherNote?: unknown };
  try {
    body = (await request.json()) as { teacherNote?: unknown };
  } catch {
    return Response.json({ ok: false, error: "صيغة الطلب غير صحيحة" }, { status: 400 });
  }

  const [existing] = await db.select().from(submissions).where(eq(submissions.id, numericId));
  if (!existing) return Response.json({ ok: false, error: "غير موجود" }, { status: 404 });

  const teacherNote = typeof body.teacherNote === "string" ? body.teacherNote.slice(0, 600) : null;

  const [row] = await db
    .update(submissions)
    .set({
      teacherNote,
      teacherReviewed: true,
      updatedAt: new Date(),
    })
    .where(eq(submissions.id, numericId))
    .returning();

  return Response.json({ ok: true, submission: row });
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await isTeacherAuthed())) return unauthorized();
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) {
    return Response.json({ ok: false, error: "معرّف غير صالح" }, { status: 400 });
  }
  await db.delete(submissions).where(eq(submissions.id, numericId));
  return Response.json({ ok: true });
}
