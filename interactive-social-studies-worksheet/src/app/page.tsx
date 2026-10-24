import Link from "next/link";
import Image from "next/image";
import { MAX_SCORE, WORKSHEET_META, getPublicWorksheet } from "@/lib/worksheet";

export default function HomePage() {
  const worksheet = getPublicWorksheet();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      {/* رأس الصفحة */}
      <section className="overflow-hidden rounded-3xl bg-navy-800 text-white shadow-2xl shadow-navy-900/20">
        <div className="relative">
          <div className="absolute inset-0">
            <Image
              src="/images/hero.jpg"
              alt="رسم توضيحي لعمارة نجدية تاريخية"
              fill
              priority
              className="object-cover opacity-30"
            />
          </div>
          <div className="relative grid gap-8 p-7 sm:p-10 lg:grid-cols-[1.2fr_0.8fr] lg:p-12">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold sm:text-sm">
                <span className="rounded-full bg-crimson-600 px-4 py-1.5">
                  {WORKSHEET_META.unit}
                </span>
                <span className="rounded-full bg-white/15 px-4 py-1.5 ring-1 ring-white/25">
                  {WORKSHEET_META.subject}
                </span>
                <span className="rounded-full bg-white/15 px-4 py-1.5 ring-1 ring-white/25">
                  {WORKSHEET_META.term}
                </span>
              </div>

              <h1 className="text-3xl leading-tight font-extrabold sm:text-4xl lg:text-5xl">
                ورقة عمل تفاعلية
                <span className="mt-2 block text-sand-100">
                  تأسيس الدولة السعودية الثانية
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-navy-100 sm:text-base">
                ورقة عمل إلكترونية منوّعة للدرس السابع، تُحلّ مباشرة من جهازك أو جوالك، وتُصحَّح
                آلياً، ثم تُرسَل إجاباتك ودرجتك إلى المعلم أونلاين في الحال.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/worksheet"
                  className="rounded-2xl bg-crimson-600 px-7 py-3.5 text-base font-extrabold shadow-lg shadow-crimson-700/30 transition hover:-translate-y-0.5 hover:bg-crimson-500"
                >
                  ابدأ حلّ ورقة العمل ✏️
                </Link>
                <Link
                  href="/teacher"
                  className="rounded-2xl bg-white/10 px-6 py-3.5 text-base font-bold ring-1 ring-white/30 transition hover:bg-white/20"
                >
                  لوحة المعلم 👨‍🏫
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 self-center">
              <InfoTile label="الصف" value="السادس" sub="الفصل 6/2" />
              <InfoTile label="الدرجة" value={`${MAX_SCORE}`} sub="درجة كاملة" />
              <InfoTile label="عدد الأسئلة" value="٦" sub="أنماط منوّعة" />
              <InfoTile label="الزمن المقترح" value="٢٠" sub="دقيقة" />
            </div>
          </div>
          <div className="pattern-band h-3 w-full bg-crimson-600" />
        </div>
      </section>

      {/* الأهداف + التعليمات */}
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-navy-100 bg-white p-6 shadow-sm sm:p-7">
          <h2 className="flex items-center gap-2 text-xl font-extrabold text-navy-800">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-navy-50 text-lg">
              🎯
            </span>
            أهداف الدرس
          </h2>
          <ul className="mt-4 space-y-3">
            {worksheet.objectives.map((objective) => (
              <li
                key={objective}
                className="flex items-start gap-3 rounded-2xl bg-navy-50/60 p-3 text-sm leading-6 text-navy-900"
              >
                <span className="mt-0.5 text-crimson-600">◆</span>
                <span>{objective}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-3xl border border-navy-100 bg-white p-6 shadow-sm sm:p-7">
          <h2 className="flex items-center gap-2 text-xl font-extrabold text-navy-800">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-crimson-50 text-lg">
              📋
            </span>
            تعليمات الحل
          </h2>
          <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
            {[
              "اكتب اسمك الثلاثي وفصلك بشكل صحيح قبل البدء.",
              "أجب عن جميع الأسئلة، ويمكنك التنقّل بينها بحرية قبل الإرسال.",
              "التصحيح إلكتروني فوري لجميع الأسئلة، والدرجة النهائية من 20.",
              "بعد الضغط على (إرسال الإجابات للمعلم) تصل نتيجتك مباشرة للوحة المعلم.",
            ].map((text, index) => (
              <li key={text} className="flex items-start gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-navy-800 text-xs font-bold text-white">
                  {index + 1}
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5 rounded-2xl border border-dashed border-crimson-200 bg-crimson-50/60 p-4 text-sm font-semibold text-crimson-700">
            💡 احرص على قراءة السؤال جيداً قبل الإجابة، فالتأنّي مفتاح الدرجة الكاملة.
          </div>
        </article>
      </section>

      {/* توزيع الدرجات */}
      <section className="mt-8 rounded-3xl border border-navy-100 bg-white p-6 shadow-sm sm:p-7">
        <h2 className="text-xl font-extrabold text-navy-800">توزيع درجات ورقة العمل</h2>
        <p className="mt-1 text-sm text-slate-500">
          خمسة أسئلة بأنماط متنوعة (اختيار • صح وخطأ • توصيل • ترتيب • إكمال)، مجموعها{" "}
          {MAX_SCORE} درجة بتصحيح إلكتروني كامل.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {worksheet.sections.map((section) => (
            <div
              key={section.id}
              className="group rounded-2xl border border-navy-100 bg-gradient-to-bl from-navy-50/70 to-white p-4 transition hover:-translate-y-0.5 hover:border-navy-400/50 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{section.icon}</span>
                <span className="rounded-full bg-crimson-600 px-3 py-1 text-xs font-bold text-white">
                  {section.points} درجات
                </span>
              </div>
              <h3 className="mt-3 text-sm font-extrabold text-navy-800">{section.order}</h3>
              <p className="text-sm font-semibold text-slate-600">{section.title}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-10 pb-6 text-center text-xs text-slate-500">
        إعداد: معلم الدراسات الاجتماعية — {WORKSHEET_META.grade} — الفصل {WORKSHEET_META.classroom}
        <span className="mx-2">•</span>
        وفق كتاب الدراسات الاجتماعية (ص ٥٦ - ٦٠)
      </footer>
    </main>
  );
}

function InfoTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4 text-center ring-1 ring-white/20 backdrop-blur">
      <p className="text-xs font-semibold text-navy-100">{label}</p>
      <p className="text-3xl font-extrabold text-white">{value}</p>
      <p className="text-[11px] text-navy-100">{sub}</p>
    </div>
  );
}
