import TeacherPanel from "@/components/teacher/TeacherPanel";
import { isTeacherAuthed, isValidTeacherKey, setTeacherCookie, tokenFor } from "@/lib/auth";
import { LESSON } from "@/lib/lesson";
import { getTeacherData } from "@/lib/teacherData";
import type { TeacherPayload } from "@/lib/teacherTypes";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "لوحة المعلم — درس التيمم",
};

type SP = Record<string, string | string[] | undefined>;

export default async function TeacherPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const rawKey = sp.k;
  const key = Array.isArray(rawKey) ? (rawKey[0] ?? "") : (rawKey ?? "");

  // الدخول المباشر: /teacher?k=كلمة المرور — يعمل دون كوكيز ودون طلبات جانب العميل
  const keyOk = isValidTeacherKey(key);
  if (keyOk) {
    // قد لا يُسمح بضبط الكوكي أثناء التصيير — رمز الجلسة في الصفحة يكفي
    await setTeacherCookie();
  }

  const authed = keyOk || (await isTeacherAuthed());

  let initial: TeacherPayload | null = null;
  let dbError = "";
  if (authed) {
    try {
      initial = await getTeacherData({ limit: 500 });
    } catch {
      dbError = "تعذّر تحميل النتائج من قاعدة البيانات";
    }
  }

  return (
    <TeacherPanel
      authed={authed}
      initial={initial}
      dbError={dbError}
      sessionToken={keyOk ? tokenFor(key) : ""}
      lesson={LESSON}
    />
  );
}
