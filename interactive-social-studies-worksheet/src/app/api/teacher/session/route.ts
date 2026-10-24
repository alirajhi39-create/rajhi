import { createTeacherToken, isPasscodeValid, isTeacherAuthed } from "@/lib/teacher-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ ok: true, authed: await isTeacherAuthed() });
}

export async function POST(request: Request) {
  let passcode = "";
  try {
    const body = (await request.json()) as { passcode?: unknown };
    passcode = typeof body.passcode === "string" ? body.passcode : "";
  } catch {
    passcode = "";
  }

  if (!isPasscodeValid(passcode)) {
    return Response.json({ ok: false, error: "رمز الدخول غير صحيح" }, { status: 401 });
  }

  return Response.json({ ok: true, authed: true, token: createTeacherToken() });
}

export async function DELETE() {
  return Response.json({ ok: true, authed: false });
}
