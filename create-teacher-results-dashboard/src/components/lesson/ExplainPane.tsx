"use client";

import { useEffect, useRef } from "react";
import { CARDS, CHAPTERS, VIDEO_SRC } from "@/lib/lesson";
import { SND } from "@/lib/sound";

export default function ExplainPane({ active }: { active: boolean }) {
  const vid = useRef<HTMLVideoElement | null>(null);
  const stopAt = useRef<number | null>(null);
  const selfSeek = useRef(false);

  useEffect(() => {
    const v = vid.current;
    if (!v) return;
    const iv = setInterval(() => {
      if (stopAt.current !== null && v.currentTime >= stopAt.current) {
        v.pause();
        stopAt.current = null;
      }
    }, 60);
    const onSeeking = () => {
      if (selfSeek.current) selfSeek.current = false;
      else stopAt.current = null;
    };
    v.addEventListener("seeking", onSeeking);
    return () => {
      clearInterval(iv);
      v.removeEventListener("seeking", onSeeking);
    };
  }, []);

  useEffect(() => {
    if (!active) vid.current?.pause();
  }, [active]);

  function playSeg(t: number, e: number | null) {
    const v = vid.current;
    if (!v) return;
    SND.click();
    stopAt.current = e;
    selfSeek.current = true;
    v.currentTime = t;
    v.play().catch(() => {});
  }

  return (
    <>
      <video id="vid" ref={vid} controls playsInline preload="metadata" src={VIDEO_SRC} />
      <div className="chap">
        <button
          type="button"
          onClick={() => playSeg(0, null)}
          style={{
            background: "linear-gradient(90deg,var(--neon),var(--pink))",
            color: "#06102a",
            border: 0,
          }}
        >
          ▶ تشغيل الدرس كاملًا
        </button>
        {CHAPTERS.map((c, i) => (
          <button key={c[1]} type="button" onClick={() => playSeg(c[0], c[2])}>
            {i + 1}. {c[1]}
          </button>
        ))}
      </div>
      <div className="grid" id="cards">
        {CARDS.map((c, i) => (
          <div
            key={c.t}
            className={`card${c.wide ? " wide" : ""}`}
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            {c.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.src} alt={c.t} />
            ) : (
              <div style={{ fontSize: 80, textAlign: "center", paddingTop: 14 }}>{c.e}</div>
            )}
            <div className="b">
              <h3>{c.t}</h3>
              <p
                className={c.ay ? "ay" : undefined}
                dangerouslySetInnerHTML={{ __html: c.x }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
