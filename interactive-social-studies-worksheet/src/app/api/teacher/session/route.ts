import { cookies } from "next/headers";
import {
  TEACHER_COOKIE,
  TEACHER_STORAGE_KEY,
  getTeacherPasscode,
  isTeacherAuthed,
} from "@/lib/teacher-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authed = await isTeacherAuthed(request);
  return Response.json({ ok: true, authed });
}

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
    /* قد يُمنع ضبط الكوكيز داخل المعاينة — نعتمد على الترويسة احتياطياً */
  }

  return Response.json({
    ok: true,
    authed: true,
    storageKey: TEACHER_STORAGE_KEY,
    token: passcode,
  });
}

export async function DELETE(request: Request) {
  try {
    const store = await cookies();
    store.delete(TEACHER_COOKIE);
  } catch {
    /* تجاهل */
  }
  void request;
  return Response.json({ ok: true, authed: false });
}
