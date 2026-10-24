import { createHmac, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";

/**
 * مصادقة المعلم عبر رمز جلسة (token) يُرسل في ترويسة x-teacher-token
 * بدل الكوكيز، حتى تعمل اللوحة داخل المعاينات المضمّنة (iframe) وعلى كل المتصفحات.
 */

export function getTeacherPasscode(): string {
  return normalizePasscode(process.env.TEACHER_PASSCODE ?? "") || "139613";
}

/** يحوّل الأرقام العربية/الفارسية إلى إنجليزية ويحذف المسافات */
export function normalizePasscode(input: string): string {
  return input
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\s\u200e\u200f\u202a-\u202e]/g, "")
    .trim();
}

export function isPasscodeValid(input: string): boolean {
  const given = normalizePasscode(input);
  const expected = getTeacherPasscode();
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createTeacherToken(): string {
  return createHmac("sha256", getTeacherPasscode()).update("teacher-dashboard-v1").digest("hex");
}

function isTokenValid(token: string | null | undefined): boolean {
  if (!token) return false;
  const expected = createTeacherToken();
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function isTeacherAuthed(): Promise<boolean> {
  const h = await headers();
  const bearer = h.get("authorization")?.replace(/^Bearer\s+/i, "");
  return isTokenValid(h.get("x-teacher-token") ?? bearer);
}

export function unauthorized() {
  return Response.json({ ok: false, error: "غير مصرّح لك بالدخول" }, { status: 401 });
}
