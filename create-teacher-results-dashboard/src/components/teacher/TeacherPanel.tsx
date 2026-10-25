"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AttemptDetail from "@/components/teacher/AttemptDetail";
import type { AnswerRecord, Attempt } from "@/db/schema";
import { QUESTIONS } from "@/lib/lesson";

/** مفتاح رمز الجلسة المخزَّن في متصفح المعلم */
const TOKEN_KEY = "altyammum_teacher_token";

type Stats = {
  total: number;
  students: number;
  avgPct: number;
  bestScore: number;
  passed: number;
  excellent: number;
  avgDuration: number;
  questions: number;
};

type PerQuestion = {
  qi: number;
  text: string;
  correctText: string;
  attempts: number;
  correct: number;
  revealed: number;
  pct: number;
  avgMs: number;
  topWrongIndex: number;
  topWrongText: string;
  topWrongCount: number;
};

type Payload = {
  ok?: boolean;
  rows: Attempt[];
  stats: Stats;
  perQuestion: PerQuestion[];
  classes: { name: string; value: string; n: number }[];
};

const RANGES = [
  { v: "all", t: "كل الفترات" },
  { v: "today", t: "اليوم" },
  { v: "week", t: "آخر ٧ أيام" },
  { v: "month", t: "آخر ٣٠ يومًا" },
];

const SORTS = [
  { v: "new", t: "الأحدث أولًا" },
  { v: "old", t: "الأقدم أولًا" },
  { v: "best", t: "الأعلى درجة" },
  { v: "worst", t: "الأقل درجة" },
];

const arTime = (d: string | Date) =>
  new Date(d).toLocaleString("ar-EG", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const mmss = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const readToken = (): string => {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
};

const writeToken = (t: string) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* تجاهل */
  }
};

/* ------------------------------- تسجيل الدخول ------------------------------- */
/**
 * الدخول عبر نموذج GET عادي (تنقّل كامل في المتصفح) — لا يعتمد على الكوكيز
 * ولا على طلبات fetch ولا على الترويسات، فيعمل داخل إطار المعاينة وخارجه.
 */
function Login() {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="dt-wrap">
      <form className="dt-login" method="get" onSubmit={() => setBusy(true)}>
        <div style={{ fontSize: 64 }}>👨‍🏫</div>
        <h1 className="dt-title">لوحة المعلم</h1>
        <p className="dt-sub">درس التيمم — نتائج الطلاب في الاختبار التفاعلي</p>
        <input
          className="dt-input"
          style={{ width: "100%", marginTop: 16, fontSize: 20, textAlign: "center" }}
          type="password"
          name="k"
          inputMode="numeric"
          autoComplete="current-password"
          value={pw}
          placeholder="كلمة المرور"
          onChange={(e) => setPw(e.target.value)}
          autoFocus
        />
        <p className="dt-note" style={{ margin: "10px 0 0" }}>
          الدخول خاص بالمعلم للاطلاع على نتائج الطلاب
        </p>
        <div className="dt-row" style={{ marginTop: 16, justifyContent: "center" }}>
          <button className="dt-btn" type="submit" disabled={busy || !pw}>
            {busy ? "جارٍ الدخول…" : "🔓 دخول"}
          </button>
          <a className="dt-btn ghost" href="/" style={{ textDecoration: "none" }}>
            ↩ العودة إلى الدرس
          </a>
        </div>
      </form>
    </div>
  );
}

/* --------------------------------- اللوحة --------------------------------- */
export default function TeacherPanel({
  authed: serverAuthed,
  initial,
  dbError,
  sessionToken,
  lesson,
}: {
  authed: boolean;
  initial: Payload | null;
  dbError?: string;
  sessionToken?: string;
  lesson: { title: string; subject: string; grade: string; teacher: string };
}) {
  const [token, setToken] = useState(sessionToken ?? "");
  const [ready, setReady] = useState(false);
  // البيانات تصل مضمّنة من الخادم أولًا، ثم يتحدث العميل عليها
  const [data, setData] = useState<Payload | null>(initial);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(dbError ?? "");
  const [sessionError, setSessionError] = useState(false);
  const [q, setQ] = useState("");
  const [cls, setCls] = useState("");
  const [range, setRange] = useState("all");
  const [sort, setSort] = useState("new");
  const [live, setLive] = useState(true);
  const [sel, setSel] = useState<Attempt | null>(null);
  const [tick, setTick] = useState(0);

  const authed = serverAuthed || !!token;

  // رمز الجلسة من الخادم (دخول مباشر) أو من حفظ المتصفح — لا reliance على الكوكيز
  useEffect(() => {
    if (sessionToken) {
      writeToken(sessionToken);
      setToken(sessionToken);
    } else {
      setToken((prev) => prev || readToken());
    }
    setReady(true);
  }, [sessionToken]);

  useEffect(() => {
    if (initial) setData(initial);
  }, [initial]);

  const headers = useCallback((): HeadersInit => {
    const h: Record<string, string> = {};
    if (token) {
      h.Authorization = `Bearer ${token}`;
      h["x-teacher-token"] = token;
    }
    return h;
  }, [token]);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setErr("");
      try {
        const sp = new URLSearchParams({ q, class: cls, range, sort, limit: "1000" });
        if (token) sp.set("token", token);
        const res = await fetch(`/api/attempts?${sp.toString()}`, {
          cache: "no-store",
          credentials: "include",
          headers: headers(),
        });
        if (res.status === 401) {
          // لا نُخرج المعلم من اللوحة: تبقى البيانات المعروضة من الخادم
          setSessionError(true);
          setErr("تعذّر التحديث التلقائي في هذا المتصفح — البيانات المعروضة هي نسخة الخادم.");
          return;
        }
        const json = (await res.json()) as Payload;
        if (json.ok !== false) {
          setData(json);
          setSessionError(false);
        } else setErr("تعذّر تحميل النتائج");
      } catch {
        setErr("تعذّر الاتصال بالخادم");
      } finally {
        setLoading(false);
      }
    },
    [q, cls, range, sort, token, headers],
  );

  useEffect(() => {
    if (!authed || !ready) return;
    void load();
  }, [authed, ready, load, tick]);

  useEffect(() => {
    if (!authed || !ready || !live) return;
    const id = setInterval(() => void load(true), 20000);
    return () => clearInterval(id);
  }, [authed, ready, live, load]);

  const rows = data?.rows ?? [];
  const stats = data?.stats;

  const hardest = useMemo(() => {
    if (!data) return null;
    const withData = data.perQuestion.filter((p) => p.attempts > 0);
    if (!withData.length) return null;
    return [...withData].sort((a, b) => a.pct - b.pct)[0];
  }, [data]);

  const topStudent = useMemo(() => {
    if (!rows.length) return null;
    return [...rows].sort((a, b) => b.correct - a.correct || b.score - a.score)[0];
  }, [rows]);

  async function exportCsv(type: "attempts" | "questions") {
    const qs = `type=${type}${token ? `&token=${encodeURIComponent(token)}` : ""}`;
    try {
      let res = await fetch(`/teacher/export?${qs}`, {
        headers: headers(),
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        // مسار بديل إن اعترض الوسيط مسارات /api أو /teacher/export
        res = await fetch(`/api/export?${qs}`, {
          headers: headers(),
          credentials: "include",
          cache: "no-store",
        });
      }
      if (!res.ok) {
        setErr("تعذّر التصدير — افتح اللوحة من رابط الدخول المباشر ثم أعد المحاولة");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = type === "questions" ? "questions-analysis.csv" : "students-results.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch {
      setErr("تعذّر التصدير — تحقق من الاتصال");
    }
  }

  /** تحديث عن طريق الخادم مباشرة — يعمل حتى لو تعذّرت طلبات الواجهة */
  function reload() {
    if (sessionError || !data) {
      window.location.href = token
        ? `/teacher?k=${encodeURIComponent(token)}`
        : window.location.pathname + "?reload=1";
      return;
    }
    void load();
  }

  async function logout() {
    writeToken("");
    setToken("");
    try {
      await fetch("/api/teacher/logout", { method: "POST", credentials: "include" });
    } catch {
      /* تجاهل */
    }
    // تنقّل كامل يضمن العودة إلى شاشة الدخول
    window.location.href = "/teacher";
  }

  async function remove(id: string) {
    if (!confirm("حذف هذه المحاولة نهائيًا؟")) return;
    await fetch(`/api/attempts/${id}`, {
      method: "DELETE",
      headers: headers(),
      credentials: "include",
    });
    setSel(null);
    void load();
  }

  // شاشة الدخول تُعرض فورًا (حتى قبل اكتمال قراءة رمز الجلسة من المتصفح)
  if (!authed) return <Login />;

  return (
    <div className="dt-wrap">
      <div className="dt-head">
        <div className="dt-t">
          <h1 className="dt-title">👨‍🏫 لوحة المعلم — نتائج الطلاب</h1>
          <div className="dt-sub">
            درس {lesson.title} • {lesson.subject} • {lesson.grade} • المعلم {lesson.teacher}
          </div>
        </div>
        <span className="dt-live">
          <span className={`dt-dot${live ? "" : " off"}`} />
          {live ? "تحديث تلقائي كل ٢٠ ثانية" : "التحديث التلقائي متوقف"}
        </span>
        <button className="dt-btn ghost sm" type="button" onClick={() => setLive(!live)}>
          {live ? "⏸ إيقاف" : "▶ تشغيل"}
        </button>
        <button className="dt-btn ghost sm" type="button" onClick={() => reload()}>
          🔄 تحديث
        </button>
        <a className="dt-btn ghost sm" href="/" style={{ textDecoration: "none" }}>
          📖 الدرس
        </a>
        <button className="dt-btn danger sm" type="button" onClick={() => void logout()}>
          🔒 خروج
        </button>
      </div>

      {err ? (
        <div className="dt-panel" style={{ borderColor: "var(--bad)" }}>
          <div className="dt-row" style={{ gap: 10 }}>
            <span>⚠️ {err}</span>
            {sessionError ? (
              <a
                className="dt-btn sm"
                href={token ? `/teacher?k=${encodeURIComponent(token)}` : "/teacher"}
                style={{ textDecoration: "none" }}
              >
                🔓 تفعيل الجلسة
              </a>
            ) : null}
            <button className="dt-btn ghost sm" type="button" onClick={() => setErr("")}>
              ✕
            </button>
          </div>
        </div>
      ) : null}

      {/* مؤشرات عامة */}
      <div className="dt-panel">
        <h2>📊 نظرة عامة</h2>
        {stats ? (
          <div className="dt-grid">
            <div className="dt-kpi">
              <b>{stats.total}</b>
              <span>عدد المحاولات</span>
            </div>
            <div className="dt-kpi p">
              <b>{stats.students}</b>
              <span>عدد الطلاب</span>
            </div>
            <div className="dt-kpi y">
              <b>{stats.avgPct}%</b>
              <span>متوسط نسبة الإجابات الصحيحة</span>
            </div>
            <div className="dt-kpi g">
              <b>{stats.excellent}</b>
              <span>ممتاز (٨٥٪ فأعلى)</span>
            </div>
            <div className="dt-kpi g">
              <b>{stats.passed}</b>
              <span>ناجح (٦٠٪ فأعلى)</span>
            </div>
            <div className="dt-kpi">
              <b>{stats.bestScore}</b>
              <span>أعلى نقاط</span>
            </div>
            <div className="dt-kpi">
              <b>{mmss(stats.avgDuration * 1000)}</b>
              <span>متوسط زمن الاختبار</span>
            </div>
            <div className="dt-kpi r">
              <b>{hardest ? `${hardest.pct}%` : "—"}</b>
              <span>{hardest ? `أصعب سؤال: ${hardest.text.slice(0, 46)}…` : "لا توجد بيانات بعد"}</span>
            </div>
          </div>
        ) : (
          <div className="dt-empty">{loading ? "جارٍ التحميل…" : "لا توجد بيانات"}</div>
        )}
      </div>

      {/* تحليل الأسئلة */}
      {data && data.perQuestion.some((p) => p.attempts > 0) ? (
        <div className="dt-panel">
          <h2>❓ تحليل الأسئلة (نسبة الإجابات الصحيحة)</h2>
          {data.perQuestion.map((p) => (
            <div className="dt-q" key={p.qi}>
              <div className="dt-qn">{p.qi + 1}</div>
              <div className="dt-qt">
                <p>{p.text}</p>
                <small>
                  ✓ {p.correct} من {p.attempts} • متوسط الزمن {p.avgMs}ث
                  {p.topWrongText
                    ? ` • أكثر إجابة خاطئة: ${p.topWrongText} (${p.topWrongCount})`
                    : ""}
                </small>
              </div>
              <div className="dt-track">
                <i
                  className={p.pct >= 70 ? "" : p.pct >= 40 ? "mid" : "low"}
                  style={{ width: `${Math.max(3, p.pct)}%` }}
                />
              </div>
              <div
                className="dt-pct"
                style={{
                  color: p.pct >= 70 ? "var(--ok)" : p.pct >= 40 ? "var(--gold)" : "var(--bad)",
                }}
              >
                {p.pct}%
              </div>
            </div>
          ))}
          <div className="dt-row" style={{ marginTop: 14 }}>
            <button
              className="dt-btn ghost sm"
              type="button"
              onClick={() => void exportCsv("questions")}
            >
              ⬇️ تصدير تحليل الأسئلة (CSV)
            </button>
          </div>
        </div>
      ) : null}

      {/* نتائج الطلاب */}
      <div className="dt-panel">
        <h2>🧑‍🎓 نتائج الطلاب</h2>
        <div className="dt-row" style={{ marginBottom: 12 }}>
          <input
            className="dt-input"
            style={{ flex: "2 1 190px" }}
            placeholder="🔍 بحث باسم الطالب…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="dt-select"
            style={{ flex: "1 1 140px" }}
            value={cls}
            onChange={(e) => setCls(e.target.value)}
          >
            <option value="">كل الصفوف</option>
            {(data?.classes ?? []).map((c) => (
              <option key={c.value || "none"} value={c.value}>
                {c.name} ({c.n})
              </option>
            ))}
          </select>
          <select
            className="dt-select"
            style={{ flex: "1 1 130px" }}
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            {RANGES.map((r) => (
              <option key={r.v} value={r.v}>
                {r.t}
              </option>
            ))}
          </select>
          <select
            className="dt-select"
            style={{ flex: "1 1 130px" }}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {SORTS.map((s) => (
              <option key={s.v} value={s.v}>
                {s.t}
              </option>
            ))}
          </select>
          <button className="dt-btn sm" type="button" onClick={() => void exportCsv("attempts")}>
            ⬇️ تصدير النتائج (CSV)
          </button>
          {(q || cls || range !== "all" || sort !== "new") && (
            <button
              className="dt-btn ghost sm"
              type="button"
              onClick={() => {
                setQ("");
                setCls("");
                setRange("all");
                setSort("new");
              }}
            >
              ✖ إلغاء التصفية
            </button>
          )}
        </div>

        {loading && !data ? (
          <div className="dt-empty">جارٍ التحميل…</div>
        ) : rows.length === 0 ? (
          <div className="dt-empty">
            🌱 لا توجد نتائج بعد ضمن هذه التصفية.
            <br />
            عندما يحل الطالب الأسئلة في صفحة الدرس ستظهر نتيجته هنا مباشرة.
          </div>
        ) : (
          <>
            <div className="dt-tablewrap">
              <table className="dt-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>الطالب</th>
                    <th>الصف/الشعبة</th>
                    <th>الصحيحة</th>
                    <th>النسبة</th>
                    <th>النقاط</th>
                    <th>الزمن</th>
                    <th>كشف</th>
                    <th>التاريخ</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const pct = r.total ? Math.round((r.correct / r.total) * 100) : 0;
                    return (
                      <tr key={r.id}>
                        <td>{i + 1}</td>
                        <td className="wrap">
                          <strong>{r.studentName}</strong>
                          {topStudent && topStudent.id === r.id ? (
                            <span className="dt-muted"> 🏆</span>
                          ) : null}
                        </td>
                        <td>{r.studentClass || "—"}</td>
                        <td>
                          {r.correct}/{r.total}
                        </td>
                        <td>
                          <span className={`dt-pill ${pct >= 85 ? "ok" : pct >= 60 ? "mid" : "no"}`}>
                            {pct}%
                          </span>
                        </td>
                        <td>{r.score}</td>
                        <td>{mmss(r.durationMs)}</td>
                        <td>{r.revealedCount || "—"}</td>
                        <td>{arTime(r.createdAt)}</td>
                        <td>
                          <div className="dt-row" style={{ gap: 6 }}>
                            <button
                              className="dt-btn ghost sm"
                              type="button"
                              onClick={() => setSel(r)}
                            >
                              👁 تفاصيل
                            </button>
                            <button
                              className="dt-btn danger sm"
                              type="button"
                              onClick={() => void remove(r.id)}
                            >
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="dt-note" style={{ marginTop: 10 }}>
              عدد المحاولات المعروضة: {rows.length} • إجمالي الأسئلة في الاختبار: {QUESTIONS.length}{" "}
              سؤالًا
              {loading ? " • جارٍ التحديث…" : ""}
            </p>
          </>
        )}
      </div>

      {sel ? <AttemptDetail row={sel} onClose={() => setSel(null)} /> : null}

      <div className="dt-panel">
        <h2>💡 ملاحظات للمعلم</h2>
        <ul className="dt-note" style={{ margin: 0, paddingInlineStart: 20 }}>
          <li>أسئلة الاختبار وشرح الفيديو هي نفسها الموجودة في صفحة الدرس دون أي تغيير.</li>
          <li>
            ترسل نتيجة الطالب تلقائيًا بعد السؤال الأخير، ويشمل التقرير إجابته لكل سؤال والزمن
            المستغرق.
          </li>
          <li>
            زر «تصدير النتائج (CSV)» ينتج ملفًا يشمل جميع المحاولات مع علامة لكل سؤال (س١ … س
            {QUESTIONS.length}).
          </li>
          <li>التحديث التلقائي يتيح متابعة النتائج لحظيًا أثناء أداء الطلاب للاختبار في الفصل.</li>
          <li>
            الأسئلة التي تنخفض نسبة الإجابة الصحيحة فيها تشير إلى نقطة تحتاج إعادة شرح — راجع مقطع
            الفيديو المناسب من تبويب «الشرح».
          </li>
          <li>
            جلسة المعلم تبقى محفوظة في هذا المتصفح ١٢ ساعة؛ إذا ظهرت رسالة «انتهت الجلسة» فسجّل
            الدخول مرة أخرى بكلمة المرور.
          </li>
        </ul>
      </div>

      <div className="dt-row" style={{ marginTop: 16, justifyContent: "center" }}>
        <button className="dt-btn ghost" type="button" onClick={() => reload()}>
          🔄 إعادة تحميل النتائج من الخادم
        </button>
      </div>
    </div>
  );
}
