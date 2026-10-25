"use client";

import { useEffect, useRef, useState } from "react";
import ExplainPane from "@/components/lesson/ExplainPane";
import QuizPane from "@/components/lesson/QuizPane";
import { initFx, fx } from "@/lib/fx";
import { LESSON } from "@/lib/lesson";
import { SND, setMuted, unlockAudio } from "@/lib/sound";

export default function LessonApp() {
  const [pane, setPane] = useState<"explain" | "quiz">("explain");
  const [muted, setMutedState] = useState(false);
  const bgRef = useRef<HTMLCanvasElement | null>(null);
  const fxRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!bgRef.current || !fxRef.current) return;
    const dispose = initFx(bgRef.current, fxRef.current);
    const onDown = (e: PointerEvent) => {
      unlockAudio();
      fx.ripple(e.clientX, e.clientY);
    };
    const onKey = (e: KeyboardEvent) => {
      if (pane !== "quiz") return;
      window.dispatchEvent(
        new CustomEvent("lesson:nav", { detail: e.key === "ArrowLeft" ? 1 : e.key === "ArrowRight" ? -1 : 0 }),
      );
    };
    addEventListener("pointerdown", onDown, { passive: true });
    addEventListener("keydown", onKey);
    return () => {
      dispose();
      removeEventListener("pointerdown", onDown);
      removeEventListener("keydown", onKey);
    };
  }, [pane]);

  function switchTo(p: "explain" | "quiz") {
    SND.click();
    setPane(p);
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  }

  function toggleFull() {
    try {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen();
    } catch {
      /* تجاهل */
    }
  }

  return (
    <>
      <canvas id="bg" className="fx" ref={bgRef} />
      <canvas id="fx" className="fx" ref={fxRef} />
      <div id="app">
        <header>
          <div className="t">
            <h1>درس {LESSON.title}</h1>
            <div className="m">
              {LESSON.subject} • {LESSON.grade} • {LESSON.teacher}
            </div>
          </div>
          <a
            className="ib"
            href="/teacher"
            title="لوحة المعلم"
            aria-label="لوحة المعلم"
            style={{
              display: "grid",
              placeItems: "center",
              textDecoration: "none",
              flex: "0 0 auto",
            }}
          >
            👨‍🏫
          </a>
          <button className="ib" id="bMute" aria-label="كتم الصوت" onClick={toggleMute} type="button">
            {muted ? "🔇" : "🔊"}
          </button>
          <button className="ib" id="bFull" aria-label="ملء الشاشة" onClick={toggleFull} type="button">
            ⛶
          </button>
        </header>

        <div className="tabs">
          <button
            type="button"
            className={`tab${pane === "explain" ? " on" : ""}`}
            onClick={() => switchTo("explain")}
          >
            📖 الشرح
          </button>
          <button
            type="button"
            className={`tab${pane === "quiz" ? " on" : ""}`}
            onClick={() => switchTo("quiz")}
          >
            ❓ الأسئلة
          </button>
        </div>

        <section className={`pane${pane === "explain" ? " on" : ""}`} id="explain">
          <ExplainPane active={pane === "explain"} />
        </section>
        <section className={`pane${pane === "quiz" ? " on" : ""}`} id="quiz">
          {pane === "quiz" ? <QuizPane onBack={() => switchTo("explain")} /> : null}
        </section>

        <footer className="dt-footer">
          <a href="/teacher">👨‍🏫 لوحة المعلم — الاطلاع على نتائج الطلاب</a>
          <div className="dt-sub" style={{ marginTop: 6 }}>
            تُرسل نتيجة كل طالب تلقائيًا بعد السؤال الأخير
          </div>
        </footer>
      </div>
    </>
  );
}
