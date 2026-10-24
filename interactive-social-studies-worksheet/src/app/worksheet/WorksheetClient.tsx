"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AnswersMap,
  GradeResult,
  PublicFillQuestion,
  PublicMatchingQuestion,
  PublicOrderingQuestion,
  PublicQuestion,
  PublicWorksheet,
} from "@/lib/worksheet-types";
import ResultView from "./ResultView";

interface Props {
  worksheet: PublicWorksheet;
}

interface StudentInfo {
  studentName: string;
  studentClass: string;
  schoolName: string;
}

function buildInitialAnswers(worksheet: PublicWorksheet): AnswersMap {
  const answers: AnswersMap = {};
  for (const section of worksheet.sections) {
    for (const q of section.questions) {
      switch (q.type) {
        case "mcq":
          answers[q.id] = { type: "mcq", value: null };
          break;
        case "truefalse":
          answers[q.id] = { type: "truefalse", value: null };
          break;
        case "matching":
          answers[q.id] = { type: "matching", value: {} };
          break;
        case "ordering":
          answers[q.id] = { type: "ordering", value: [] };
          break;
        case "fill":
          answers[q.id] = { type: "fill", value: {} };
          break;
      }
    }
  }
  return answers;
}

function isAnswered(q: PublicQuestion, answers: AnswersMap): boolean {
  const a = answers[q.id];
  if (!a) return false;
  switch (a.type) {
    case "mcq":
      return a.value !== null;
    case "truefalse":
      return a.value !== null;
    case "matching":
      return (
        q.type === "matching" && q.left.every((l) => Boolean(a.value[l.id]))
      );
    case "ordering":
      return q.type === "ordering" && a.value.length === q.items.length;
    case "fill":
      return (
        q.type === "fill" &&
        q.segments
          .filter((s) => s.kind === "blank")
          .every((s) => s.kind === "blank" && Boolean(a.value[s.id]))
      );
  }
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function WorksheetClient({ worksheet }: Props) {
  const [info, setInfo] = useState<StudentInfo>({
    studentName: "",
    studentClass: worksheet.classroom,
    schoolName: "",
  });
  const [answers, setAnswers] = useState<AnswersMap>(() => buildInitialAnswers(worksheet));
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmIncomplete, setConfirmIncomplete] = useState(false);
  const [result, setResult] = useState<
    (GradeResult & { submissionId: number; sentAt: string }) | null
  >(null);
  const topRef = useRef<HTMLDivElement>(null);

  const allQuestions = useMemo(
    () => worksheet.sections.flatMap((s) => s.questions),
    [worksheet],
  );

  const answeredCount = allQuestions.filter((q) => isAnswered(q, answers)).length;
  const progress = Math.round((answeredCount / allQuestions.length) * 100);

  useEffect(() => {
    if (result) return;
    const timer = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, [result]);

  const update = useCallback((questionId: string, next: AnswersMap[string]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: next }));
    setConfirmIncomplete(false);
  }, []);

  async function send() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...info, answers, durationSeconds: elapsed }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
        submissionId?: number;
        sentAt?: string;
        result?: GradeResult;
      };
      if (!response.ok || !data.ok || !data.result) {
        throw new Error(data.error ?? "تعذّر إرسال الإجابات، حاول مرة أخرى");
      }
      setResult({
        ...data.result,
        submissionId: data.submissionId ?? 0,
        sentAt: data.sentAt ?? new Date().toISOString(),
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit() {
    setError(null);
    if (info.studentName.trim().length < 2) {
      setError("الرجاء كتابة اسم الطالب أولاً في بطاقة البيانات أعلى الصفحة.");
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (answeredCount < allQuestions.length && !confirmIncomplete) {
      setConfirmIncomplete(true);
      return;
    }
    void send();
  }

  if (result) {
    return (
      <ResultView
        worksheet={worksheet}
        result={result}
        info={info}
        durationSeconds={elapsed}
      />
    );
  }

  return (
    <div className="animate-fade-up">
      <div ref={topRef} />

      {/* ترويسة ورقة العمل */}
      <header className="overflow-hidden rounded-3xl bg-navy-800 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 p-6 sm:p-7">
          <div>
            <p className="text-xs font-bold text-navy-100">
              {worksheet.subject} • {worksheet.unit} • {worksheet.term}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">
              {worksheet.lesson}
            </h1>
            <p className="mt-1 text-sm text-navy-100">
              {worksheet.grade} — الفصل {worksheet.classroom}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 px-4 py-2 text-center ring-1 ring-white/20">
              <p className="text-[11px] text-navy-100">الزمن</p>
              <p className="text-lg font-extrabold tabular-nums">{formatTime(elapsed)}</p>
            </div>
            <div className="rounded-2xl bg-crimson-600 px-4 py-2 text-center shadow-lg">
              <p className="text-[11px] text-crimson-50">الدرجة</p>
              <p className="text-lg font-extrabold">من {worksheet.maxScore}</p>
            </div>
          </div>
        </div>
        <div className="pattern-band h-2.5 w-full bg-crimson-600" />
      </header>

      {/* بطاقة بيانات الطالب */}
      <section className="mt-5 rounded-3xl border border-navy-100 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-navy-800">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-navy-50">🧑‍🎓</span>
          بيانات الطالب
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="اسم الطالب (ثلاثي)"
            required
            value={info.studentName}
            placeholder="اكتب اسمك هنا"
            onChange={(v) => setInfo((p) => ({ ...p, studentName: v }))}
          />
          <Field
            label="الفصل"
            value={info.studentClass}
            placeholder="6/2"
            onChange={(v) => setInfo((p) => ({ ...p, studentClass: v }))}
          />
          <Field
            label="المدرسة (اختياري)"
            value={info.schoolName}
            placeholder="اسم المدرسة"
            onChange={(v) => setInfo((p) => ({ ...p, schoolName: v }))}
          />
        </div>
      </section>

      {/* شريط التقدّم */}
      <div className="sticky top-2 z-20 mt-5">
        <div className="rounded-2xl border border-navy-100 bg-white/95 p-3 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between text-xs font-bold text-navy-800">
            <span>
              تمّت الإجابة عن {answeredCount} من {allQuestions.length} أسئلة
            </span>
            <span className="text-crimson-600">{progress}%</span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-navy-50">
            <div
              className="h-full rounded-full bg-gradient-to-l from-crimson-600 to-navy-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* الأسئلة */}
      <div className="mt-6 space-y-7">
        {worksheet.sections.map((section) => (
          <section
            key={section.id}
            className="overflow-hidden rounded-3xl border border-navy-100 bg-white shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-50 bg-gradient-to-l from-navy-50 to-white px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-navy-800 text-xl text-white">
                  {section.icon}
                </span>
                <div>
                  <p className="text-xs font-bold text-crimson-600">{section.order}</p>
                  <h3 className="text-lg font-extrabold text-navy-800">{section.title}</h3>
                </div>
              </div>
              <span className="rounded-full bg-crimson-600 px-4 py-1.5 text-xs font-bold text-white">
                {section.points} درجات
              </span>
            </div>

            <p className="border-b border-dashed border-navy-100 bg-sand-50 px-5 py-3 text-sm font-semibold text-slate-600">
              {section.instruction}
            </p>

            <div className="divide-y divide-navy-50">
              {section.questions.map((question, index) => (
                <QuestionBlock
                  key={question.id}
                  question={question}
                  index={index + 1}
                  answers={answers}
                  answered={isAnswered(question, answers)}
                  onChange={update}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* للاطلاع */}
      <section className="mt-7 overflow-hidden rounded-3xl border-2 border-navy-200 bg-sand-50">
        <div className="flex items-center gap-2 bg-navy-800 px-5 py-2.5 text-sm font-extrabold text-white">
          <span>🔎</span> للاطلاع
        </div>
        <ul className="space-y-2 p-5 text-sm leading-7 font-semibold text-navy-900">
          <li>
            ◆ يُعدّ الإمام تركي بن عبدالله بن محمد بن سعود من أحفاد الإمام محمد بن سعود مؤسس
            الدولة السعودية الأولى.
          </li>
          <li>
            ◆ الإمام تركي بن عبدالله هو جدّ الملك عبدالعزيز مؤسس المملكة العربية السعودية التي
            ننعم اليوم برخائها وأمنها واستقرارها.
          </li>
          <li>◆ تُوفّي الإمام تركي بن عبدالله عام ١٢٤٩هـ، وتولّى الحكم بعده ابنه الإمام فيصل.</li>
        </ul>
      </section>

      {/* الإرسال */}
      <section className="no-print mt-8 rounded-3xl border border-navy-100 bg-white p-6 shadow-lg">
        {error ? (
          <p className="mb-4 animate-shake rounded-2xl bg-crimson-50 px-4 py-3 text-sm font-bold text-crimson-700">
            ⚠️ {error}
          </p>
        ) : null}

        {confirmIncomplete ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            ⏳ لديك {allQuestions.length - answeredCount} سؤال/أسئلة بدون إجابة. اضغط
            «إرسال الإجابات» مرة أخرى للإرسال على أي حال.
          </div>
        ) : null}

        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm font-semibold text-slate-600">
            تأكّد من مراجعة إجاباتك، فلن تتمكّن من تعديلها بعد الإرسال.
          </p>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full max-w-md rounded-2xl bg-crimson-600 px-8 py-4 text-lg font-extrabold text-white shadow-xl shadow-crimson-700/25 transition hover:-translate-y-0.5 hover:bg-crimson-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {submitting ? "جارٍ الإرسال…" : "📤 إرسال الإجابات للمعلم"}
          </button>
          <p className="text-xs text-slate-400">
            سيتم تصحيح إجاباتك آلياً وإرسال النتيجة إلى لوحة المعلم فوراً.
          </p>
        </div>
      </section>
    </div>
  );
}

/* --------------------------- عناصر مساعدة --------------------------- */

function Field({
  label,
  value,
  placeholder,
  required,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-navy-800">
        {label} {required ? <span className="text-crimson-600">*</span> : null}
      </span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-navy-100 bg-navy-50/40 px-4 py-3 text-sm font-semibold text-navy-900 outline-none transition focus:border-navy-400 focus:bg-white focus:ring-4 focus:ring-navy-100"
      />
    </label>
  );
}

function QuestionBlock({
  question,
  index,
  answers,
  answered,
  onChange,
}: {
  question: PublicQuestion;
  index: number;
  answers: AnswersMap;
  answered: boolean;
  onChange: (id: string, value: AnswersMap[string]) => void;
}) {
  return (
    <div className="p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm font-extrabold transition ${
            answered ? "bg-emerald-500 text-white" : "bg-navy-50 text-navy-700"
          }`}
        >
          {answered ? "✓" : index}
        </span>
        <div>
          <p className="text-base leading-7 font-bold text-navy-900">{question.prompt}</p>
          {question.hint ? (
            <p className="mt-1 text-xs font-semibold text-slate-400">💡 {question.hint}</p>
          ) : null}
        </div>
      </div>

      <div className="pr-0 sm:pr-11">
        {question.type === "mcq" ? (
          <McqInput question={question} answers={answers} onChange={onChange} />
        ) : null}
        {question.type === "truefalse" ? (
          <TrueFalseInput questionId={question.id} answers={answers} onChange={onChange} />
        ) : null}
        {question.type === "matching" ? (
          <MatchingInput question={question} answers={answers} onChange={onChange} />
        ) : null}
        {question.type === "ordering" ? (
          <OrderingInput question={question} answers={answers} onChange={onChange} />
        ) : null}
        {question.type === "fill" ? (
          <FillInput question={question} answers={answers} onChange={onChange} />
        ) : null}
      </div>
    </div>
  );
}

const LETTERS = ["أ", "ب", "ج", "د", "هـ"];

function McqInput({
  question,
  answers,
  onChange,
}: {
  question: Extract<PublicQuestion, { type: "mcq" }>;
  answers: AnswersMap;
  onChange: (id: string, value: AnswersMap[string]) => void;
}) {
  const current = answers[question.id];
  const selected = current && current.type === "mcq" ? current.value : null;

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {question.options.map((option, index) => {
        const active = selected === index;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(question.id, { type: "mcq", value: index })}
            className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-right text-sm font-bold transition ${
              active
                ? "animate-pop border-navy-600 bg-navy-600 text-white shadow-md"
                : "border-navy-100 bg-white text-navy-900 hover:border-navy-400 hover:bg-navy-50"
            }`}
          >
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-extrabold ${
                active ? "bg-white/20 text-white" : "bg-navy-50 text-navy-700"
              }`}
            >
              {LETTERS[index] ?? index + 1}
            </span>
            {option}
          </button>
        );
      })}
    </div>
  );
}

function TrueFalseInput({
  questionId,
  answers,
  onChange,
}: {
  questionId: string;
  answers: AnswersMap;
  onChange: (id: string, value: AnswersMap[string]) => void;
}) {
  const current = answers[questionId];
  const selected = current && current.type === "truefalse" ? current.value : null;

  const choices: { label: string; value: boolean; icon: string; activeClass: string }[] = [
    { label: "صح", value: true, icon: "✔", activeClass: "border-emerald-600 bg-emerald-600" },
    { label: "خطأ", value: false, icon: "✘", activeClass: "border-crimson-600 bg-crimson-600" },
  ];

  return (
    <div className="flex gap-3">
      {choices.map((choice) => {
        const active = selected === choice.value;
        return (
          <button
            key={choice.label}
            type="button"
            onClick={() => onChange(questionId, { type: "truefalse", value: choice.value })}
            className={`flex min-w-28 items-center justify-center gap-2 rounded-2xl border-2 px-6 py-3 text-sm font-extrabold transition ${
              active
                ? `animate-pop ${choice.activeClass} text-white shadow-md`
                : "border-navy-100 bg-white text-navy-800 hover:border-navy-400 hover:bg-navy-50"
            }`}
          >
            <span className="text-lg">{choice.icon}</span>
            {choice.label}
          </button>
        );
      })}
    </div>
  );
}

function MatchingInput({
  question,
  answers,
  onChange,
}: {
  question: PublicMatchingQuestion;
  answers: AnswersMap;
  onChange: (id: string, value: AnswersMap[string]) => void;
}) {
  const current = answers[question.id];
  const map = current && current.type === "matching" ? current.value : {};

  function select(leftId: string, rightId: string) {
    const next: Record<string, string> = { ...map };
    // منع تكرار نفس الإجابة لأكثر من عنصر
    for (const key of Object.keys(next)) {
      if (next[key] === rightId) delete next[key];
    }
    if (rightId) next[leftId] = rightId;
    else delete next[leftId];
    onChange(question.id, { type: "matching", value: next });
  }

  return (
    <div className="space-y-3">
      {question.left.map((left, index) => {
        const chosen = map[left.id] ?? "";
        return (
          <div
            key={left.id}
            className={`grid items-center gap-3 rounded-2xl border-2 p-3 transition sm:grid-cols-[180px_1fr] ${
              chosen ? "border-navy-400 bg-navy-50/60" : "border-navy-100 bg-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-crimson-600 text-xs font-bold text-white">
                {index + 1}
              </span>
              <span className="text-sm font-extrabold text-navy-900">{left.text}</span>
              <span className="text-navy-400">⟵</span>
            </div>
            <select
              value={chosen}
              onChange={(event) => select(left.id, event.target.value)}
              className="w-full rounded-xl border border-navy-100 bg-white px-3 py-2.5 text-sm font-semibold text-navy-900 outline-none transition focus:border-navy-400 focus:ring-4 focus:ring-navy-100"
            >
              <option value="">— اختر الوصف المناسب —</option>
              {question.right.map((right) => (
                <option key={right.id} value={right.id}>
                  {right.text}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}

function OrderingInput({
  question,
  answers,
  onChange,
}: {
  question: PublicOrderingQuestion;
  answers: AnswersMap;
  onChange: (id: string, value: AnswersMap[string]) => void;
}) {
  const current = answers[question.id];
  const order = current && current.type === "ordering" ? current.value : [];
  const remaining = question.items.filter((item) => !order.includes(item.id));

  function add(id: string) {
    onChange(question.id, { type: "ordering", value: [...order, id] });
  }

  function removeAt(index: number) {
    const next = order.filter((_, i) => i !== index);
    onChange(question.id, { type: "ordering", value: next });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-dashed border-navy-200 bg-sand-50 p-4">
        <p className="mb-3 text-xs font-bold text-slate-500">
          الأسماء المتاحة — انقر عليها بالترتيب الزمني الصحيح:
        </p>
        <div className="flex flex-wrap gap-2">
          {remaining.length === 0 ? (
            <span className="text-xs font-bold text-emerald-600">
              ✓ تم ترتيب جميع الأسماء
            </span>
          ) : null}
          {remaining.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => add(item.id)}
              className="rounded-xl border-2 border-navy-100 bg-white px-4 py-2 text-sm font-bold text-navy-900 transition hover:-translate-y-0.5 hover:border-navy-400 hover:bg-navy-50"
            >
              {item.text}
              {item.caption ? (
                <span className="mr-2 text-[11px] font-semibold text-slate-400">
                  {item.caption}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {order.length === 0 ? (
          <p className="rounded-2xl bg-navy-50/60 px-4 py-3 text-xs font-bold text-slate-500">
            لم تختر أي اسم بعد — سيظهر ترتيبك هنا.
          </p>
        ) : null}
        {order.map((id, index) => {
          const item = question.items.find((i) => i.id === id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => removeAt(index)}
              className="flex w-full items-center gap-3 rounded-2xl border-2 border-navy-600 bg-navy-600 px-4 py-3 text-right text-sm font-bold text-white transition hover:bg-navy-700"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/20 text-xs font-extrabold">
                {index + 1}
              </span>
              <span className="flex-1">{item?.text}</span>
              {item?.caption ? (
                <span className="text-[11px] font-semibold text-navy-100">{item.caption}</span>
              ) : null}
              <span className="text-xs text-navy-100">إزالة ✕</span>
            </button>
          );
        })}
      </div>

      {order.length > 0 ? (
        <button
          type="button"
          onClick={() => onChange(question.id, { type: "ordering", value: [] })}
          className="rounded-xl bg-navy-50 px-4 py-2 text-xs font-bold text-navy-700 transition hover:bg-navy-100"
        >
          ↺ إعادة الترتيب من جديد
        </button>
      ) : null}
    </div>
  );
}

function FillInput({
  question,
  answers,
  onChange,
}: {
  question: PublicFillQuestion;
  answers: AnswersMap;
  onChange: (id: string, value: AnswersMap[string]) => void;
}) {
  const current = answers[question.id];
  const map = current && current.type === "fill" ? current.value : {};
  const blanks = question.segments.flatMap((s) => (s.kind === "blank" ? [s] : []));
  const [activeBlank, setActiveBlank] = useState<string | null>(null);
  const used = Object.values(map);

  function assign(word: string) {
    const target = activeBlank ?? blanks.find((b) => !map[b.id])?.id ?? null;
    if (!target) return;
    const next = { ...map, [target]: word };
    onChange(question.id, { type: "fill", value: next });
    setActiveBlank(null);
  }

  function toggleBlank(blankId: string) {
    if (map[blankId]) {
      const next = { ...map };
      delete next[blankId];
      onChange(question.id, { type: "fill", value: next });
      setActiveBlank(blankId);
    } else {
      setActiveBlank((prev) => (prev === blankId ? null : blankId));
    }
  }

  let blankIndex = 0;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-dashed border-crimson-200 bg-crimson-50/40 p-4">
        <p className="mb-3 text-xs font-bold text-crimson-700">بنك الكلمات:</p>
        <div className="flex flex-wrap gap-2">
          {question.bank.map((word) => {
            const isUsed = used.includes(word);
            return (
              <button
                key={word}
                type="button"
                disabled={isUsed}
                onClick={() => assign(word)}
                className={`rounded-xl border-2 px-4 py-2 text-sm font-bold transition ${
                  isUsed
                    ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 line-through"
                    : "border-crimson-200 bg-white text-crimson-700 hover:-translate-y-0.5 hover:border-crimson-400 hover:bg-crimson-50"
                }`}
              >
                {word}
              </button>
            );
          })}
        </div>
      </div>

      <p className="rounded-2xl bg-sand-50 p-4 text-base leading-10 font-semibold text-navy-900">
        {question.segments.map((segment, index) => {
          if (segment.kind === "text") {
            return <span key={`t-${index}`}> {segment.value} </span>;
          }
          blankIndex += 1;
          const value = map[segment.id];
          const active = activeBlank === segment.id;
          return (
            <button
              key={segment.id}
              type="button"
              onClick={() => toggleBlank(segment.id)}
              className={`mx-1 inline-flex min-w-32 items-center justify-center rounded-xl border-2 px-3 py-1 text-sm font-extrabold transition ${
                value
                  ? "border-navy-600 bg-navy-600 text-white"
                  : active
                    ? "animate-pop border-crimson-500 bg-crimson-50 text-crimson-700"
                    : "border-dashed border-navy-300 bg-white text-slate-400"
              }`}
            >
              {value ?? `( ${blankIndex} ) ............`}
            </button>
          );
        })}
      </p>
      <p className="text-xs font-semibold text-slate-400">
        💡 انقر على الفراغ لتحديده، ثم اختر الكلمة المناسبة من البنك. انقر على الفراغ الممتلئ
        لإفراغه.
      </p>
    </div>
  );
}


