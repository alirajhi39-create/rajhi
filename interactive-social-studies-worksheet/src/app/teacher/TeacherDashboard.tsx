"use client";

import { useCallback, useEffect, useState } from "react";
import type { QuestionResult } from "@/lib/worksheet-types";

interface SubmissionRecord {
  id: number;
  studentName: string;
  studentClass: string;
  schoolName: string | null;
  autoScore: number;
  totalScore: number;
  maxScore: number;
  correctCount: number;
  durationSeconds: number;
  teacherReviewed: boolean;
  teacherNote: string | null;
  createdAt: string;
  breakdown: QuestionResult[];
}

interface Stats {
  count: number;
  average: number;
  highest: number;
  lowest: number;
  passed: number;
  maxScore: number;
}

const TOKEN_KEY = "tw_teacher_token";
const TOKEN_HEADER = "x-teacher-token";

/** إضافة رمز المعلم لكل طلب — يضمن الدخول حتى لو مُنع الكوكيز داخل المعاينة */
function authHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  try {
    const token = window.sessionStorage.getItem(TOKEN_KEY);
    if (token) headers.set(TOKEN_HEADER, token);
  } catch {
    /* تجاهل */
  }
  if (!headers.has("Content-Type") && !headers.has("content-type")) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

function readStorage(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    /* تجاهل */
  }
}

function clearStorage() {
  try {
    window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* تجاهل */
  }
}

export default function TeacherDashboard() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<SubmissionRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selected, setSelected] = useState<SubmissionRecord | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await fetch("/api/submissions", {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (response.status === 401) {
        setAuthed(false);
        return false;
      }
      const data = (await response.json()) as {
        ok: boolean;
        stats: Stats;
        submissions: SubmissionRecord[];
      };
      if (data.ok) {
        setRows(data.submissions);
        setStats(data.stats);
        setAuthed(true);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/teacher/session", {
          headers: authHeaders(),
          cache: "no-store",
        });
        const data = (await response.json()) as { authed: boolean };
        if (data.authed) {
          await load();
        } else {
          clearStorage();
          setAuthed(false);
        }
      } catch {
        setAuthed(false);
      }
    })();
  }, [load]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setLoginError(null);
    const code = passcode.trim();
    if (code.length < 4) {
      setLoginError("أدخل رمز الدخول (٦ أرقام) أولاً.");
      return;
    }
    setLoggingIn(true);
    try {
      const response = await fetch("/api/teacher/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: code }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setLoginError(data.error ?? "رمز الدخول غير صحيح.");
        return;
      }
      readStorage(TOKEN_KEY, code);
      setPasscode("");
      const ok = await load();
      if (!ok) {
        setLoginError("تم قبول الرمز لكن تعذّر تحميل البيانات — أعد المحاولة.");
      }
    } catch {
      setLoginError(
        "تعذّر الاتصال بالخادم. أعد تحميل الصفحة ثم حاول مرة أخرى.",
      );
    } finally {
      setLoggingIn(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/teacher/session", { method: "DELETE", headers: authHeaders() });
    } catch {
      /* تجاهل */
    }
    clearStorage();
    setAuthed(false);
    setRows([]);
    setStats(null);
    setSelected(null);
    setPasscode("");
  }

  async function downloadCsv() {
    try {
      const response = await fetch("/api/submissions/export", { headers: authHeaders() });
      if (!response.ok) {
        setLoginError("تعذّر التصدير — أعد إدخال رمز الدخول.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "نتائج-الصف-6-2.csv";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setLoginError("تعذّر التصدير — تأكّد من الاتصال بالخادم.");
    }
  }

  async function remove(id: number) {
    if (!window.confirm("هل تريد حذف هذه المشاركة نهائياً؟")) return;
    await fetch(`/api/submissions/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    setSelected(null);
    await load();
  }

  async function saveReview(id: number, teacherNote: string) {
    try {
      const response = await fetch(`/api/submissions/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ teacherNote }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        submission?: SubmissionRecord;
      };
      if (data.ok && data.submission) {
        setSelected({ ...data.submission, breakdown: selected?.breakdown ?? [] });
        await load();
      }
    } catch {
      /* تجاهل */
    }
  }

  if (authed === null) {
    return (
      <div className="grid place-items-center rounded-3xl border border-navy-100 bg-white p-16 text-sm font-bold text-slate-400 shadow-sm">
        جارٍ التحميل…
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="mx-auto max-w-md animate-fade-up rounded-3xl border border-navy-100 bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-navy-800 text-3xl">
            👨‍🏫
          </div>
          <h1 className="text-2xl font-extrabold text-navy-800">لوحة المعلم</h1>
          <p className="mt-1 text-sm text-slate-500">
            أدخل رمز الدخول للاطلاع على إجابات الطلاب ودرجاتهم.
          </p>
        </div>
        <form onSubmit={login} className="space-y-4">
          <input
            type="password"
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            placeholder="رمز الدخول"
            className="w-full rounded-2xl border border-navy-100 bg-navy-50/40 px-4 py-3 text-center text-lg font-extrabold tracking-widest text-navy-900 outline-none focus:border-navy-400 focus:bg-white focus:ring-4 focus:ring-navy-100"
          />
          {loginError ? (
            <p className="animate-shake rounded-xl bg-crimson-50 px-4 py-2 text-center text-sm font-bold text-crimson-700">
              {loginError}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loggingIn}
            className="w-full rounded-2xl bg-crimson-600 px-6 py-3 text-base font-extrabold text-white shadow-lg transition hover:bg-crimson-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loggingIn ? "جارٍ التحقق…" : "دخول"}
          </button>
          <p className="text-center text-xs text-slate-400">
            هذه اللوحة خاصة بالمعلم فقط — أدخل رمز الدخول المخصص لك.
          </p>
        </form>
      </div>
    );
  }

  const filtered = rows.filter((row) =>
    `${row.studentName} ${row.studentClass}`.includes(query.trim()),
  );

  return (
    <div className="animate-fade-up space-y-6">
      <header className="overflow-hidden rounded-3xl bg-navy-800 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">لوحة متابعة إجابات الطلاب</h1>
            <p className="mt-1 text-sm text-navy-100">
              الدراسات الاجتماعية — الدرس السابع: تأسيس الدولة السعودية الثانية — الصف 6/2
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm font-bold">
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl bg-white/10 px-4 py-2 ring-1 ring-white/25 transition hover:bg-white/20"
            >
              ↻ تحديث
            </button>
            <button
              type="button"
              onClick={() => void downloadCsv()}
              className="rounded-xl bg-emerald-600 px-4 py-2 transition hover:bg-emerald-500"
            >
              ⬇️ تصدير Excel
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-xl bg-crimson-600 px-4 py-2 transition hover:bg-crimson-500"
            >
              خروج
            </button>
          </div>
        </div>
        <div className="pattern-band h-2.5 w-full bg-crimson-600" />
      </header>

      {stats ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="عدد المشاركات" value={`${stats.count}`} icon="📨" />
          <StatCard
            label="متوسط الدرجات"
            value={`${stats.average} / ${stats.maxScore}`}
            icon="📊"
          />
          <StatCard label="أعلى درجة" value={`${stats.highest}`} icon="🏆" />
          <StatCard label="أدنى درجة" value={`${stats.lowest}`} icon="📉" />
          <StatCard label="اجتازوا النصف" value={`${stats.passed}`} icon="✅" />
        </div>
      ) : null}

      <ShareCard />

      {rows.length > 0 ? <QuestionAnalytics rows={rows} /> : null}

      <section className="overflow-hidden rounded-3xl border border-navy-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-50 p-4">
          <h2 className="text-lg font-extrabold text-navy-800">سجل المشاركات</h2>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="🔍 ابحث باسم الطالب أو الفصل"
            className="w-full rounded-xl border border-navy-100 bg-navy-50/40 px-4 py-2 text-sm font-semibold outline-none focus:border-navy-400 focus:bg-white sm:w-72"
          />
        </div>

        {loading ? (
          <p className="p-8 text-center text-sm font-bold text-slate-400">جارٍ التحميل…</p>
        ) : filtered.length === 0 ? (
          <p className="p-10 text-center text-sm font-bold text-slate-400">
            لا توجد مشاركات بعد — شارك رابط ورقة العمل مع طلابك.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-right text-sm">
              <thead className="bg-navy-50 text-xs font-extrabold text-navy-800">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">اسم الطالب</th>
                  <th className="px-4 py-3">الفصل</th>
                  <th className="px-4 py-3">الدرجة</th>
                  <th className="px-4 py-3">النسبة</th>
                  <th className="px-4 py-3">الزمن</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3">التاريخ</th>
                  <th className="px-4 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {filtered.map((row, index) => {
                  const percent = Math.round((row.totalScore / row.maxScore) * 100);
                  return (
                    <tr key={row.id} className="transition hover:bg-navy-50/40">
                      <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                      <td className="px-4 py-3 font-extrabold text-navy-900">
                        {row.studentName}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.studentClass}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-extrabold text-white ${
                            percent >= 80
                              ? "bg-emerald-600"
                              : percent >= 50
                                ? "bg-amber-500"
                                : "bg-crimson-600"
                          }`}
                        >
                          {row.totalScore} / {row.maxScore}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-600">{percent}%</td>
                      <td className="px-4 py-3 text-slate-500">
                        {Math.max(1, Math.round(row.durationSeconds / 60))} د
                      </td>
                      <td className="px-4 py-3">
                        {row.teacherReviewed ? (
                          <span className="text-xs font-bold text-emerald-600">معتمدة ✓</span>
                        ) : (
                          <span className="text-xs font-bold text-amber-600">بانتظار الاعتماد</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(row.createdAt).toLocaleString("ar-SA", { hour12: true })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setSelected(row)}
                            className="rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-navy-700"
                          >
                            عرض
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(row.id)}
                            className="rounded-lg bg-crimson-50 px-3 py-1.5 text-xs font-bold text-crimson-700 transition hover:bg-crimson-100"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected ? (
        <SubmissionModal
          record={selected}
          onClose={() => setSelected(null)}
          onSave={saveReview}
        />
      ) : null}
    </div>
  );
}

function ShareCard() {
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState("");

  useEffect(() => {
    setLink(`${window.location.origin}/worksheet`);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="rounded-3xl border-2 border-dashed border-navy-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-extrabold text-navy-800">🔗 رابط ورقة العمل للطلاب</h2>
      <p className="mt-1 text-xs text-slate-500">
        انسخ الرابط وأرسله لطلاب الفصل عبر منصة مدرستي أو مجموعة الواتساب.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          readOnly
          value={link}
          className="min-w-0 flex-1 rounded-xl border border-navy-100 bg-navy-50/50 px-4 py-2.5 text-sm font-semibold text-navy-800 outline-none"
        />
        <button
          type="button"
          onClick={() => void copy()}
          className="rounded-xl bg-navy-800 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-navy-700"
        >
          {copied ? "تم النسخ ✓" : "نسخ الرابط"}
        </button>
      </div>
    </section>
  );
}

function QuestionAnalytics({ rows }: { rows: SubmissionRecord[] }) {
  const map = new Map<string, { prompt: string; earned: number; points: number }>();

  for (const row of rows) {
    const breakdown = Array.isArray(row.breakdown) ? row.breakdown : [];
    for (const item of breakdown) {
      const entry = map.get(item.questionId) ?? {
        prompt: item.prompt,
        earned: 0,
        points: 0,
      };
      entry.earned += item.earned;
      entry.points += item.points;
      map.set(item.questionId, entry);
    }
  }

  const items = Array.from(map.entries())
    .map(([id, entry]) => ({
      id,
      prompt: entry.prompt,
      percent: entry.points > 0 ? Math.round((entry.earned / entry.points) * 100) : 0,
    }))
    .sort((a, b) => a.percent - b.percent);

  if (items.length === 0) return null;

  return (
    <section className="rounded-3xl border border-navy-100 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-extrabold text-navy-800">📈 تحليل أداء الفصل لكل سؤال</h2>
      <p className="mt-1 text-xs text-slate-500">
        مرتّبة من الأصعب إلى الأسهل — تساعدك في تحديد المفاهيم التي تحتاج إلى معالجة.
      </p>
      <div className="mt-4 space-y-3">
        {items.map((item, index) => (
          <div key={item.id}>
            <div className="flex items-start justify-between gap-3 text-xs font-bold text-navy-900">
              <span className="line-clamp-1 flex-1">
                <span className="ml-1 text-slate-400">{index + 1}.</span>
                {item.prompt}
              </span>
              <span
                className={
                  item.percent >= 70
                    ? "text-emerald-600"
                    : item.percent >= 45
                      ? "text-amber-600"
                      : "text-crimson-600"
                }
              >
                {item.percent}%
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-navy-50">
              <div
                className={`h-full rounded-full transition-all ${
                  item.percent >= 70
                    ? "bg-emerald-500"
                    : item.percent >= 45
                      ? "bg-amber-500"
                      : "bg-crimson-600"
                }`}
                style={{ width: `${item.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-500">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="mt-1 text-2xl font-extrabold text-navy-800">{value}</p>
    </div>
  );
}

function SubmissionModal({
  record,
  onClose,
  onSave,
}: {
  record: SubmissionRecord;
  onClose: () => void;
  onSave: (id: number, teacherNote: string) => Promise<void>;
}) {
  const [note, setNote] = useState(record.teacherNote ?? "");
  const [saving, setSaving] = useState(false);

  const breakdown = Array.isArray(record.breakdown) ? record.breakdown : [];

  async function save() {
    setSaving(true);
    await onSave(record.id, note);
    setSaving(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-navy-900/60 p-3 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <div
        className="mx-auto max-w-3xl rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between rounded-t-3xl bg-navy-800 px-6 py-4 text-white">
          <div>
            <h3 className="text-xl font-extrabold">{record.studentName}</h3>
            <p className="text-xs text-navy-100">
              الفصل {record.studentClass} • {record.schoolName ?? "—"} • مشاركة #{record.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/10 px-3 py-1.5 text-sm font-bold transition hover:bg-white/20"
          >
            إغلاق ✕
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="الدرجة النهائية" value={`${record.totalScore} / ${record.maxScore}`} />
            <MiniStat label="التصحيح الآلي" value={`${record.autoScore}`} />
            <MiniStat label="إجابات صحيحة" value={`${record.correctCount}`} />
            <MiniStat
              label="زمن الحل"
              value={`${Math.max(1, Math.round(record.durationSeconds / 60))} د`}
            />
          </div>

          <div className="space-y-2.5">
            {breakdown.map((item, index) => {
              const full = item.earned === item.points;
              const partial = item.earned > 0 && !full;
              return (
                <div
                  key={item.questionId}
                  className={`rounded-2xl border-2 p-3 ${
                    full
                      ? "border-emerald-200 bg-emerald-50/50"
                      : partial
                        ? "border-amber-200 bg-amber-50/50"
                        : "border-crimson-200 bg-crimson-50/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex-1 text-sm font-bold text-navy-900">
                      <span className="ml-1 text-slate-400">{index + 1}.</span>
                      {item.prompt}
                    </p>
                    <span className="shrink-0 rounded-full bg-navy-800 px-2.5 py-1 text-xs font-extrabold text-white">
                      {item.earned}/{item.points}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-6 font-semibold text-slate-700">
                    <span className="font-extrabold text-navy-700">إجابة الطالب: </span>
                    {item.studentAnswerText}
                  </p>
                  {!full ? (
                    <p className="text-xs leading-6 font-semibold text-emerald-700">
                      <span className="font-extrabold">الصحيح: </span>
                      {item.correctAnswerText}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border-2 border-dashed border-navy-200 bg-navy-50/50 p-4">
            <h4 className="text-sm font-extrabold text-navy-800">
              ملاحظة المعلم للطالب
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              الدرجة نهائية ومصححة إلكترونياً بالكامل — يمكنك إضافة ملاحظة تشجيعية أو توجيهية.
            </p>
            <textarea
              value={note}
              rows={3}
              onChange={(event) => setNote(event.target.value)}
              placeholder="اكتب ملاحظتك للطالب هنا (اختياري)…"
              className="mt-3 w-full rounded-2xl border border-navy-100 bg-white p-3 text-sm font-semibold outline-none focus:border-navy-400 focus:ring-4 focus:ring-navy-100"
            />
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="mt-3 rounded-2xl bg-emerald-600 px-6 py-2.5 text-sm font-extrabold text-white transition hover:bg-emerald-500 disabled:opacity-60"
            >
              {saving ? "جارٍ الحفظ…" : "💾 حفظ الملاحظة واعتماد المراجعة"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-navy-50/70 px-3 py-2 text-center">
      <p className="text-[11px] font-bold text-slate-500">{label}</p>
      <p className="text-sm font-extrabold text-navy-900">{value}</p>
    </div>
  );
}
