import { cookies } from "next/headers";

export const TEACHER_COOKIE = "tw_teacher";
export const TEACHER_TOKEN_HEADER = "x-teacher-token";
/** مفتاح تخزين الرمز في المتصفح (كمصدر ثانٍ للدخول إن مُنع الكوكيز) */
export const TEACHER_STORAGE_KEY = "tw_teacher_token";

export function getTeacherPasscode(): string {
  const envValue = process.env.TEACHER_PASSCODE?.trim();
  if (envValue && envValue.length >= 4) return envValue;
  return "139613";
}

function isValidToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const expected = getTeacherPasscode();
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * يقبل الرمز من: كوكيز (الطريقة الأولى) أو ترويسة x-teacher-token (احتياطي
 * داخل المعاينة حيث قد تُمنع الكوكيز) أو باراميتر ?t= في روابط التنزيل.
 */
export async function isTeacherAuthed(request?: Request): Promise<boolean> {
  const store = await cookies();
  if (isValidToken(store.get(TEACHER_COOKIE)?.value)) return true;

  if (request) {
    if (isValidToken(request.headers.get(TEACHER_TOKEN_HEADER))) return true;
    try {
      const url = new URL(request.url);
      if (isValidToken(url.searchParams.get("t"))) return true;
    } catch {
      /* تجاهل */
    }
  }
  return false;
}

export function unauthorized() {
  return Response.json(
    { ok: false, error: "انتهت الجلسة — أعد إدخال رمز الدخول" },
    { status: 401 },
  );
}
