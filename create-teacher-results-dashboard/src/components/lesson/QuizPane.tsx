"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SafeImg from "@/components/lesson/SafeImg";
import type { AnswerRecord } from "@/db/schema";
import { fx } from "@/lib/fx";
import {
  CLASS_NAMES,
  QUESTIONS,
  TIMER_ON,
  TIMER_SECONDS,
  makeOrder,
} from "@/lib/lesson";
import { SND } from "@/lib/sound";

type QS = {
  order: number[];
  done: boolean;
  chosen: number;
  revealed: boolean;
  t0: number;
  got: number;
  ms: number;
};

const LETTERS = ["أ", "ب", "ج", "د"];
const N = QUESTIONS.length;

function buildStates(): QS[] {
  let prev = -1;
  return QUESTIONS.map((q) => {
    const order = makeOrder(q.a.length, prev);
    prev = order.indexOf(0);
    return { order, done: false, chosen: -1, revealed: false, t0: 0, got: 0, ms: 0 };
  });
}

export default function QuizPane({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState<"gate" | "quiz" | "result">("gate");
  const [name, setName] = useState("");
  const [klass, setKlass] = useState("");
  const [gateError, setGateError] = useState("");

  const [S, setS] = useState<QS[]>(() => buildStates());
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [right, setRight] = useState(0);
  const [tLeft, setTLeft] = useState(TIMER_SECONDS);
  const [tRunning, setTRunning] = useState(false);
  const [submit, setSubmit] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const sRef = useRef<QS[]>(S);
  const idxRef = useRef(0);
  const scoreRef = useRef(0);
  const rightRef = useRef(0);
  const tLeftRef = useRef(TIMER_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef(0);
  const sentKey = useRef("");
  const opRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const info = useRef({ name: "", klass: "" });

  sRef.current = S;
  idxRef.current = idx;

  /* ------------------------------- المؤقت ------------------------------- */
  const stopT = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setTRunning(false);
  }, []);

  const drawT = useCallback((v: number) => {
    tLeftRef.current = v;
    setTLeft(v);
  }, []);

  useEffect(() => () => stopT(), [stopT]);

  const reveal = useCallback(() => {
    const i = idxRef.current;
    const cur = sRef.current[i];
    if (!cur || cur.done) return;
    stopT();
    const ms = cur.t0 ? Date.now() - cur.t0 : 0;
    setS((prev) => {
      const next = prev.slice();
      next[i] = { ...next[i], done: true, revealed: true, ms };
      sRef.current = next;
      return next;
    });
    SND.click();
  }, [stopT]);

  const startT = useCallback(() => {
    const i = idxRef.current;
    if (sRef.current[i]?.done) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setTRunning(true);
    let last = Math.ceil(tLeftRef.current);
    timerRef.current = setInterval(() => {
      let v = tLeftRef.current - 0.1;
      if (v <= 3 && Math.ceil(v) !== last && v > 0) SND.tick();
      last = Math.ceil(v);
      if (v <= 0) {
        drawT(0);
        stopT();
        reveal();
        return;
      }
      drawT(v);
    }, 100);
  }, [drawT, reveal, stopT]);

  /* --------------------------- تنقّل بالأسهم --------------------------- */
  const go = useCallback(
    (d: number) => {
      const i = idxRef.current;
      const n = i + d;
      if (n < 0) return;
      SND.whoosh(d > 0);
      if (n >= N) {
        if (!sRef.current[i]?.done) return;
        setPhase("result");
        stopT();
        return;
      }
      stopT();
      drawT(TIMER_SECONDS);
      setIdx(n);
      idxRef.current = n;
      const target = sRef.current[n];
      if (target && !target.done && !target.t0) {
        setS((prev) => {
          const next = prev.slice();
          next[n] = { ...next[n], t0: Date.now() };
          sRef.current = next;
          return next;
        });
      }
    },
    [drawT, stopT],
  );

  useEffect(() => {
    const onNav = (e: Event) => {
      const d = (e as CustomEvent<number>).detail;
      if (phase === "quiz" && d) go(d);
    };
    window.addEventListener("lesson:nav", onNav as EventListener);
    return () => window.removeEventListener("lesson:nav", onNav as EventListener);
  }, [go, phase]);

  /* ------------------------------ الاختيار ------------------------------ */
  function choose(p: number) {
    const i = idxRef.current;
    const cur = sRef.current[i];
    if (!cur || cur.done) return;
    stopT();
    const ok = cur.order[p] === 0;
    const ms = cur.t0 ? Date.now() - cur.t0 : 0;
    const bonus = Math.round(50 * Math.max(0, 1 - ms / 20000));
    const got = ok ? 100 + bonus : 0;

    setS((prev) => {
      const next = prev.slice();
      next[i] = { ...next[i], done: true, chosen: p, ms, got };
      sRef.current = next;
      return next;
    });
    SND.click();

    if (ok) {
      scoreRef.current += got;
      rightRef.current += 1;
      setScore(scoreRef.current);
      setRight(rightRef.current);
      SND.ok();
      const el = opRefs.current[p];
      if (el) {
        const r = el.getBoundingClientRect();
        fx.confetti(r.left + r.width / 2, r.top + r.height / 2, 40);
      }
    } else {
      SND.bad();
    }
  }

  /* ------------------------------ الإرسال ------------------------------ */
  const submitResult = useCallback(async () => {
    const answers: AnswerRecord[] = sRef.current.map((s, qi) => {
      const picked = s.chosen >= 0 ? (s.order[s.chosen] ?? -1) : -1;
      return {
        qi,
        pos: s.chosen,
        picked,
        ok: picked === 0,
        revealed: s.revealed && picked === -1,
        skipped: !s.done,
        ms: s.ms || 0,
        got: s.got || 0,
      };
    });
    const key = `${info.current.name}|${rightRef.current}|${scoreRef.current}|${startedAt.current}`;
    if (sentKey.current === key) return;
    sentKey.current = key;
    setSubmit("sending");
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: info.current.name,
          studentClass: info.current.klass,
          answers,
          durationMs: Date.now() - startedAt.current,
          device: navigator.userAgent.slice(0, 120),
        }),
      });
      const data = (await res.json()) as { ok?: boolean };
      setSubmit(data.ok ? "sent" : "error");
      if (!data.ok) sentKey.current = "";
    } catch {
      setSubmit("error");
      sentKey.current = "";
    }
  }, []);

  useEffect(() => {
    if (phase === "result") {
      SND.end();
      fx.rain();
      void submitResult();
    }
  }, [phase, submitResult]);

  /* ------------------------------ بدء الاختبار ------------------------------ */
  function begin() {
    const n = name.trim().replace(/\s+/g, " ");
    if (n.length < 2) {
      setGateError("اكتب اسمك كاملًا (حرفان على الأقل) ليتمكن معلمك من رؤية نتيجتك.");
      return;
    }
    setGateError("");
    info.current = { name: n.slice(0, 60), klass: klass.trim().slice(0, 40) };
    try {
      localStorage.setItem("altyammum_student", JSON.stringify(info.current));
    } catch {
      /* تجاهل */
    }
    restart();
    setPhase("quiz");
  }

  function restart() {
    stopT();
    const fresh = buildStates();
    sRef.current = fresh;
    setS(fresh);
    setIdx(0);
    idxRef.current = 0;
    scoreRef.current = 0;
    rightRef.current = 0;
    setScore(0);
    setRight(0);
    drawT(TIMER_SECONDS);
    startedAt.current = Date.now();
    sentKey.current = "";
    setSubmit("idle");
    fresh[0] = { ...fresh[0], t0: Date.now() };
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem("altyammum_student");
      if (raw) {
        const saved = JSON.parse(raw) as { name?: string; klass?: string };
        if (saved.name) setName(saved.name);
        if (saved.klass) setKlass(saved.klass);
      }
    } catch {
      /* تجاهل */
    }
  }, []);

  /* ------------------------------- العرض ------------------------------- */
  if (phase === "gate") {
    return (
      <div className="qa">
        <div className="qrow" style={{ alignItems: "flex-start" }}>
          <div className="em">📝</div>
          <div className="q" style={{ fontSize: "clamp(20px,3vw,30px)" }}>
            قَبْلَ أَنْ تَبْدَأَ الِاخْتِبَارَ، اكْتُبِ اسْمَكَ وَاخْتَرْ صَفَّكَ حَتَّى تَصِلَ نَتِيجَتُكَ إِلَى
            مُعَلِّمِكَ.
          </div>
        </div>
        <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
          <input
            className="dt-input"
            style={{ fontSize: 20, padding: "14px 16px" }}
            value={name}
            maxLength={60}
            placeholder="اسم الطالب (مثال: أحمد محمد)"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") begin();
            }}
          />
          <div className="dt-scroll-x">
            {CLASS_NAMES.map((c) => (
              <button
                key={c}
                type="button"
                className={`dt-chip${klass === c ? " on" : ""}`}
                onClick={() => {
                  SND.click();
                  setKlass(klass === c ? "" : c);
                }}
              >
                {c}
              </button>
            ))}
            <input
              className="dt-input"
              style={{ flex: "1 1 160px" }}
              value={klass}
              maxLength={40}
              placeholder="أو اكتب صفّك/شعبتك"
              onChange={(e) => setKlass(e.target.value)}
            />
          </div>
          {gateError ? (
            <div className="why on" style={{ borderColor: "var(--bad)", background: "rgba(255,77,109,.12)" }}>
              ⚠️ {gateError}
            </div>
          ) : (
            <p className="hint">
              عدد الأسئلة {N} سؤالًا • {TIMER_ON ? `مؤقت اختياري ${TIMER_SECONDS} ثانية لكل سؤال • ` : ""}
              تُرسل النتيجة تلقائيًا إلى لوحة المعلم بعد السؤال الأخير.
            </p>
          )}
          <div className="nav">
            <button className="btn" type="button" onClick={begin}>
              ▶ ابدأ الاختبار
            </button>
            <button className="btn g" type="button" onClick={onBack}>
              📖 العودة إلى الشرح
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "result") {
    const pct = right / N;
    const g = pct >= 0.85 ? ["ممتاز", "🏆"] : pct >= 0.6 ? ["جيد جدًا", "🌟"] : ["حاولوا مرة أخرى", "💪"];
    const skipped = sRef.current.filter((s) => !s.done).length;
    return (
      <div className="qa res">
        <div style={{ fontSize: 90 }}>{g[1]}</div>
        <h2>{g[0]}</h2>
        <div className="dt-sub" style={{ fontSize: 20, marginBottom: 6 }}>
          {info.current.name}
          {info.current.klass ? ` — ${info.current.klass}` : ""}
        </div>
        <div className="big">
          ✓ الإجابات الصحيحة: {right} من {N}
        </div>
        <div className="big" style={{ color: "var(--gold)" }}>
          ⭐ النقاط: {score}
        </div>
        {skipped > 0 ? (
          <div className="dt-sub">لم تُجب عن {skipped} سؤالًا</div>
        ) : null}
        <div className="dt-live" style={{ justifyContent: "center", marginTop: 10 }}>
          {submit === "sending" ? (
            <>
              <span className="dt-dot" /> جارٍ إرسال النتيجة إلى المعلم…
            </>
          ) : submit === "sent" ? (
            <>
              <span className="dt-dot" /> ✅ تم إرسال نتيجتك إلى لوحة المعلم
            </>
          ) : submit === "error" ? (
            <>
              <span className="dt-dot off" /> تعذّر إرسال النتيجة إلى المعلم
              <button
                className="dt-btn sm"
                type="button"
                style={{ marginInlineStart: 8 }}
                onClick={() => {
                  sentKey.current = "";
                  void submitResult();
                }}
              >
                🔄 إعادة الإرسال
              </button>
            </>
          ) : (
            <>
              <span className="dt-dot off" /> النتيجة محفوظة لديك
            </>
          )}
        </div>
        <div className="nav">
          <button
            className="btn"
            type="button"
            onClick={() => {
              SND.click();
              restart();
              setPhase("quiz");
            }}
          >
            🔁 إعادة الاختبار
          </button>
          <button
            className="btn g"
            type="button"
            onClick={() => {
              SND.click();
              onBack();
            }}
          >
            📖 العودة إلى الشرح
          </button>
        </div>
      </div>
    );
  }

  const q = QUESTIONS[idx];
  const s = S[idx];
  const ringOffset = 176 * (1 - tLeft / TIMER_SECONDS);

  return (
    <>
      <div className="top">
        <div className="num">{idx + 1}</div>
        <div className="bar">
          <i style={{ width: `${(idx / N) * 100}%` }} />
        </div>
        {TIMER_ON ? (
          <div className="tm">
            <div className={`ring${tLeft <= 3 ? " low" : ""}`}>
              <svg width="64" height="64" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,.15)" />
                <circle
                  id="rb"
                  cx="32"
                  cy="32"
                  r="28"
                  style={{ strokeDashoffset: ringOffset }}
                />
              </svg>
              <b>{Math.ceil(tLeft)}</b>
            </div>
            <button
              className="ib"
              type="button"
              aria-label="المؤقت"
              onClick={() => {
                SND.click();
                if (tRunning) stopT();
                else startT();
              }}
            >
              {tRunning ? "⏸" : "⏱"}
            </button>
          </div>
        ) : null}
        <div className="score">⭐ {score}</div>
      </div>

      <div className="qa inR" key={idx}>
        <div className="qrow">
          {q.src ? (
            <SafeImg src={q.src} alt="" emoji={q.e || "❓"} embedKey={q.img} />
          ) : (
            <div className="em">{q.e || "❓"}</div>
          )}
          <div className="q">{q.q}</div>
        </div>

        <div className="opts">
          {s.order.map((o, p) => {
            const isCorrect = o === 0;
            const cls = s.done
              ? isCorrect
                ? "op ok"
                : p === s.chosen
                  ? "op no"
                  : "op"
              : "op";
            return (
              <button
                key={`${idx}-${p}`}
                ref={(el) => {
                  opRefs.current[p] = el;
                }}
                className={cls}
                type="button"
                disabled={s.done}
                style={{
                  animationDelay: `${0.25 + p * 0.12}s`,
                  opacity: s.done ? 1 : undefined,
                  animation: s.done ? "none" : undefined,
                }}
                onClick={() => choose(p)}
                onPointerEnter={(e) => {
                  if (e.pointerType === "mouse" && !s.done) SND.hover();
                }}
              >
                <span className="l">{LETTERS[p]}</span>
                <span>{q.a[o]}</span>
                <span className="mk">
                  {s.done && isCorrect ? "✓" : s.done && p === s.chosen ? "✗" : ""}
                </span>
              </button>
            );
          })}
        </div>

        <div className={`why${s.done ? " on" : ""}`}>💡 {q.why}</div>

        <div className="nav">
          <button className="btn g" type="button" disabled={idx === 0} onClick={() => go(-1)}>
            ▶ السابق
          </button>
          <button className="btn g" type="button" disabled={s.done} onClick={reveal}>
            👁 اكشف الإجابة
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => {
              if (idx === N - 1) {
                if (!s.done) return;
                SND.whoosh(true);
                stopT();
                setPhase("result");
              } else go(1);
            }}
          >
            {idx === N - 1 ? "النتيجة 🏆" : "التالي ◀"}
          </button>
        </div>
      </div>
    </>
  );
}
