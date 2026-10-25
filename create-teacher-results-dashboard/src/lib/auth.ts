import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const TEACHER_COOKIE = "altyammum_teacher";
/** مفتاح رمز الجلسة في متصفح المعلم (يعمل حتى مع حجب الكوكيز داخل الإطارات) */
export const TEACHER_TOKEN_KEY = "altyammum_teacher_token";

/** كلمة مرور لوحة المعلم — يمكن تغييرها من متغير البيئة TEACHER_PASSWORD */
export const DEFAULT_TEACHER_PASSWORD = "1234";

export function teacherPassword(): string {
  return process.env.TEACHER_PASSWORD?.trim() || DEFAULT_TEACHER_PASSWORD;
}

function secret(): string {
  return process.env.TEACHER_SECRET || "altyammum-teacher-panel-secret";
}

export function tokenFor(password: string): string {
  return createHmac("sha256", secret()).update(password).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function validToken(value: string): boolean {
  try {
    return safeEqual(value, tokenFor(teacherPassword()));
  } catch {
    return false;
  }
}

/** يقبل كلمة المرور أو رمز الجلسة — يُستخدم للدخول المباشر عبر الرابط */
export function isValidTeacherKey(key: string): boolean {
  if (!key) return false;
  return key === teacherPassword() || validToken(key);
}

export async function isTeacherAuthed(): Promise<boolean> {
  const store = await cookies();
  const value = store.get(TEACHER_COOKIE)?.value;
  if (!value) return false;
  return validToken(value);
}

/**
 * يفحص كل الطرق الممكنة حتى لا يفشل الدخول بسبب حجب الكوكيز أو إسقاط الترويسات:
 * ١) ترويسة Authorization: Bearer  ٢) معامل في الرابط token/k  ٣) الكوكي
 */
export async function isTeacherAuthedRequest(req?: Request): Promise<boolean> {
  if (req) {
    const header = req.headers.get("authorization") ?? "";
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (match && validToken(match[1].trim())) return true;

    try {
      const url = new URL(req.url);
      for (const key of ["token", "k"]) {
        const value = url.searchParams.get(key);
        if (!value) continue;
        // يقبل رمز الجلسة أو كلمة المرور نفسها في الرابط (دخول مباشر)
        if (validToken(value) || value === teacherPassword()) return true;
      }
    } catch {
      /* تجاهل */
    }

    const cookieHeader = req.headers.get("cookie") ?? "";
    const fromCookie = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${TEACHER_COOKIE}=`))
      ?.slice(TEACHER_COOKIE.length + 1);
    if (fromCookie && validToken(fromCookie)) return true;

    const xToken = req.headers.get("x-teacher-token") ?? "";
    if (xToken && validToken(xToken)) return true;
  }
  return isTeacherAuthed();
}

export async function setTeacherCookie() {
  try {
    const store = await cookies();
    store.set(TEACHER_COOKIE, tokenFor(teacherPassword()), {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 12,
    });
  } catch {
    /* بعض البيئات تمنع ضبط الكوكي — رمز الجلسة يكفي */
  }
}

export async function clearTeacherCookie() {
  try {
    const store = await cookies();
    store.delete(TEACHER_COOKIE);
  } catch {
    /* تجاهل */
  }
}
