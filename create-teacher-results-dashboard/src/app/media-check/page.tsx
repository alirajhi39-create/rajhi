import MediaProbe from "@/components/MediaProbe";
import { databaseUrl, db, isNeonUrl } from "@/db";
import { attempts } from "@/db/schema";
import { MEDIA_BASE } from "@/lib/media";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export const metadata = { title: "فحص الوسائط — درس التيمم" };

export default async function MediaCheckPage() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto")?.split(",")[0] ?? "https";
  const host = h.get("x-forwarded-host")?.split(",")[0] ?? h.get("host") ?? "localhost:3000";
  const origin = `${proto}://${host}`;
  const base = MEDIA_BASE || origin;

  // حالة قاعدة البيانات دون كشف أي بيانات حساسة
  const url = databaseUrl();
  const dbState = !url
    ? "غير مضبوط"
    : isNeonUrl(url)
      ? "مضبوط (Neon)"
      : "مضبوط (PostgreSQL محلي)";
  let dbOk = false;
  let rows = 0;
  if (url) {
    try {
      await db.execute(sql`select 1`);
      const c = await db.select({ n: sql<number>`count(*)::int` }).from(attempts);
      dbOk = true;
      rows = c[0]?.n ?? 0;
    } catch {
      dbOk = false;
    }
  }

  return (
    <div className="dt-wrap">
      <div className="dt-head">
        <div className="dt-t">
          <h1 className="dt-title">🩺 فحص الوسائط وقاعدة البيانات</h1>
          <div className="dt-sub">
            النشرة الحالية: <code dir="ltr">{origin}</code>
          </div>
        </div>
        <a className="dt-btn ghost sm" href="/" style={{ textDecoration: "none" }}>
          📖 الدرس
        </a>
        <a className="dt-btn ghost sm" href="/teacher" style={{ textDecoration: "none" }}>
          👨‍🏫 اللوحة
        </a>
      </div>

      <div className="dt-panel">
        <h2>🎞️ فحص الفيديو والصور (من متصفحك)</h2>
        <p className="dt-note" style={{ marginBottom: 12 }}>
          source: <code dir="ltr">{base}/media/…</code> — يُفحص كل ملف فعليًا كما يحمّله الطالب.
        </p>
        <MediaProbe base={base} />
      </div>

      <div className="dt-panel">
        <h2>🗄️ قاعدة البيانات والإعدادات</h2>
        <div className="dt-grid">
          <div className={`dt-kpi ${dbOk ? "g" : "r"}`}>
            <b>{dbOk ? "متصلة" : "منقطعة"}</b>
            <span>حالة الاتصال</span>
          </div>
          <div className="dt-kpi">
            <b style={{ fontSize: 20 }}>{dbState}</b>
            <span>DATABASE_URL</span>
          </div>
          <div className="dt-kpi y">
            <b>{rows}</b>
            <span>محاولة محفوظة للطلاب</span>
          </div>
          <div className="dt-kpi p">
            <b style={{ fontSize: 18 }}>{MEDIA_BASE ? "خارجي" : "داخل المشروع"}</b>
            <span>مصدر الوسائط (NEXT_PUBLIC_MEDIA_BASE)</span>
          </div>
        </div>
        {!dbOk ? (
          <p className="dt-note" style={{ marginTop: 12, fontSize: 15 }}>
            {!url
              ? "أضف المتغير DATABASE_URL في إعدادات Vercel (رابط Neon مع sslmode=require)."
              : "تحقق من صحة رابط Neon وأنه المنفذ المجمّع (pooler)، ثم نفّذ npx drizzle-kit push لإنشاء جدول attempts."}
          </p>
        ) : null}
      </div>

      <div className="dt-panel">
        <h2>💡 لماذا تختفي الوسائط بعد النشر على Vercel؟</h2>
        <ul className="dt-note" style={{ margin: 0, paddingInlineStart: 20, fontSize: 15, lineHeight: 2.1 }}>
          <li>
            الفيديو والصور ملفات محلية في <code dir="ltr">public/media</code> (٧٫٥٧ MB) — إن لم تُرفع
            مع المستودع يعيد الرابط <b>404</b>.
          </li>
          <li>
            حد Vercel للملفات الثابتة في خطة Hobby هو <b>100 MB</b>، فحجم وسائطنا ضمن الحد ولا مشكلة
            فيه.
          </li>
          <li>
            حد الـ<b>4.5 MB</b> يخص أجسام طلبات/استجابات الـFunctions فقط، ولا ينطبق على الفيديو لأنه
            يُخدم كملف ثابت من CDN.
          </li>
          <li>
            إن كان المشروع داخل مجلد فرعي في المستودع، اضبط <b>Settings → Root Directory</b> في Vercel
            على ذلك المجلد.
          </li>
          <li>
            بعد أي تعديل أعد النشر، ثم افتح <code dir="ltr">/media-check</code> للتأكد قبل إرسال الرابط
            للطلاب.
          </li>
        </ul>
      </div>
    </div>
  );
}
