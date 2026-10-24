"use client";

import Link from "next/link";
import type { GradeResult, PublicWorksheet, QuestionResult } from "@/lib/worksheet-types";

interface Props {
  worksheet: PublicWorksheet;
  result: GradeResult & { submissionId: number; sentAt: string };
  info: { studentName: string; studentClass: string; schoolName: string };
  durationSeconds: number;
}

function gradeLabel(percent: number) {
  if (percent >= 90) return { text: "ممتاز 🌟", color: "text-emerald-600", bg: "bg-emerald-50" };
  if (percent >= 80) return { text: "جيد جداً 👏", color: "text-navy-700", bg: "bg-navy-50" };
  if (percent >= 65) return { text: "جيد 👍", color: "text-amber-600", bg: "bg-amber-50" };
  if (percent >= 50) return { text: "مقبول", color: "text-orange-600", bg: "bg-orange-50" };
  return { text: "يحتاج إلى مراجعة الدرس", color: "text-crimson-700", bg: "bg-crimson-50" };
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m} د ${s.toString().padStart(2, "0")} ث`;
}

export default function ResultView({
  worksheet,
  result,
  info,
  durationSeconds,
}: Props) {
  const percent = Math.round((result.totalScore / result.maxScore) * 100);
  const label = gradeLabel(percent);
  const sentAt = new Date(result.sentAt);

  const bySection = worksheet.sections.map((section) => ({
    section,
    items: result.breakdown.filter((item) => item.sectionId === section.id),
  }));

  return (
    <div className="animate-fade-up space-y-6">
      {/* إشعار الإرسال */}
      <div className="rounded-3xl border-2 border-emerald-200 bg-emerald-50 p-5 text-center">
        <p className="text-lg font-extrabold text-emerald-700">
          ✅ تم إرسال إجاباتك إلى المعلم بنجاح
        </p>
        <p className="mt-1 text-sm font-semibold text-emerald-700/80">
          رقم المشاركة: #{result.submissionId} • وقت الإرسال:{" "}
          {sentAt.toLocaleString("ar-SA", { hour12: true })}
        </p>
      </div>

      {/* بطاقة النتيجة */}
      <section className="print-card overflow-hidden rounded-3xl border border-navy-100 bg-white shadow-xl">
        <div className="bg-navy-800 px-6 py-5 text-white">
          <p className="text-xs font-bold text-navy-100">
            {worksheet.subject} • {worksheet.lesson}
          </p>
          <h2 className="mt-1 text-2xl font-extrabold">بطاقة نتيجة الطالب</h2>
        </div>

        <div className="grid gap-6 p-6 sm:grid-cols-[220px_1fr] sm:p-8">
          <div className="mx-auto">
            <div
              className="grid h-48 w-48 place-items-center rounded-full"
              style={{
                background: `conic-gradient(var(--color-crimson-600) ${percent * 3.6}deg, var(--color-navy-100) 0deg)`,
              }}
            >
              <div className="grid h-36 w-36 place-items-center rounded-full bg-white text-center shadow-inner">
                <div>
                  <p className="text-4xl font-extrabold text-navy-800">
                    {result.totalScore}
                    <span className="text-xl text-slate-400">/{result.maxScore}</span>
                  </p>
                  <p className="text-sm font-bold text-crimson-600">{percent}%</p>
                </div>
              </div>
            </div>
            <p
              className={`mt-3 rounded-2xl px-4 py-2 text-center text-sm font-extrabold ${label.bg} ${label.color}`}
            >
              {label.text}
            </p>
          </div>

          <div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Info label="اسم الطالب" value={info.studentName || "—"} />
              <Info label="الفصل" value={info.studentClass || worksheet.classroom} />
              <Info label="المدرسة" value={info.schoolName || "—"} />
              <Info label="زمن الحل" value={formatTime(durationSeconds)} />
              <Info
                label="إجابات صحيحة كاملة"
                value={`${result.correctCount} من ${result.questionCount}`}
              />
              <Info
                label="النتيجة"
                value={percent >= 50 ? "ناجح ✅" : "يحتاج إلى مراجعة الدرس 📚"}
              />
            </dl>

            <div className="mt-4 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
              🤖 تم تصحيح جميع إجاباتك إلكترونياً بشكل كامل وفوري، ووصلت نتيجتك النهائية إلى
              معلمك.
            </div>

            <div className="no-print mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-2xl bg-navy-800 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-navy-700"
              >
                🖨️ طباعة / حفظ PDF
              </button>
              <Link
                href="/"
                className="rounded-2xl bg-navy-50 px-5 py-2.5 text-sm font-bold text-navy-700 transition hover:bg-navy-100"
              >
                الصفحة الرئيسة
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* مراجعة الإجابات */}
      <section className="print-card rounded-3xl border border-navy-100 bg-white p-6 shadow-sm sm:p-7">
        <h2 className="text-xl font-extrabold text-navy-800">مراجعة الإجابات والتغذية الراجعة</h2>
        <p className="mt-1 text-sm text-slate-500">
          راجع إجاباتك وتعرّف على الإجابة الصحيحة لكل سؤال.
        </p>

        <div className="mt-5 space-y-6">
          {bySection.map(({ section, items }) => (
            <div key={section.id}>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-crimson-600">
                <span>{section.icon}</span>
                {section.order}: {section.title}
              </h3>
              <div className="space-y-3">
                {items.map((item, index) => (
                  <ReviewCard key={item.questionId} item={item} index={index + 1} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-navy-50/60 px-4 py-3">
      <dt className="text-[11px] font-bold text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-extrabold text-navy-900">{value}</dd>
    </div>
  );
}

function ReviewCard({ item, index }: { item: QuestionResult; index: number }) {
  const full = item.earned === item.points;
  const partial = item.earned > 0 && !full;

  const tone = full
    ? "border-emerald-200 bg-emerald-50/60"
    : partial
      ? "border-amber-200 bg-amber-50/60"
      : "border-crimson-200 bg-crimson-50/50";

  const badge = full
    ? "bg-emerald-600"
    : partial
      ? "bg-amber-500"
      : "bg-crimson-600";

  return (
    <div className={`rounded-2xl border-2 p-4 ${tone}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="flex-1 text-sm leading-7 font-bold text-navy-900">
          <span className="ml-2 text-slate-400">{index}.</span>
          {item.prompt}
        </p>
        <span className={`rounded-full px-3 py-1 text-xs font-extrabold text-white ${badge}`}>
          {item.earned} / {item.points}
        </span>
      </div>

      <div className="mt-3 space-y-1.5 text-xs leading-6 sm:text-sm">
        <p className="font-semibold text-slate-700">
          <span className="font-extrabold text-navy-700">إجابتك: </span>
          <span className={full ? "text-emerald-700" : "text-crimson-700"}>
            {item.studentAnswerText}
          </span>
        </p>
        {!full ? (
          <p className="font-semibold text-slate-700">
            <span className="font-extrabold text-navy-700">الإجابة الصحيحة: </span>
            <span className="text-emerald-700">{item.correctAnswerText}</span>
          </p>
        ) : null}
        {item.explanation ? (
          <p className="rounded-xl bg-white/70 px-3 py-2 font-semibold text-slate-600">
            💡 {item.explanation}
          </p>
        ) : null}
      </div>
    </div>
  );
}
