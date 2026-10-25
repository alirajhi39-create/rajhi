"use client";

import { useEffect, useRef, useState } from "react";
import SafeImg from "@/components/lesson/SafeImg";
import { embeddedVideo } from "@/lib/embeddedMedia";
import { CARDS, CHAPTERS, VIDEO_SRC } from "@/lib/lesson";
import { SND } from "@/lib/sound";

export default function ExplainPane({ active }: { active: boolean }) {
  const vid = useRef<HTMLVideoElement | null>(null);
  const stopAt = useRef<number | null>(null);
  const selfSeek = useRef(false);
  const [videoError, setVideoError] = useState(false);
  const [videoSrc, setVideoSrc] = useState(VIDEO_SRC);
  const [usedEmbed, setUsedEmbed] = useState(false);
  const [loadingEmbed, setLoadingEmbed] = useState(false);

  // عند غياب ملفات public/media نعرض الفيديو من النسخة المضمّنة داخل الكود
  async function onVideoError() {
    if (usedEmbed) {
      setVideoError(true);
      return;
    }
    setLoadingEmbed(true);
    const data = await embeddedVideo();
    setLoadingEmbed(false);
    if (data) {
      setUsedEmbed(true);
      setVideoError(false);
      setVideoSrc(data);
    } else {
      setVideoError(true);
    }
  }

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
      <video
        id="vid"
        ref={vid}
        controls
        playsInline
        preload="metadata"
        src={videoSrc}
        onError={() => void onVideoError()}
        onLoadedData={() => setVideoError(false)}
      />

      {loadingEmbed ? (
        <div className="why on" style={{ fontSize: 17 }}>
          ⏳ جارٍ تجهيز فيديو الشرح من النسخة المضمّنة داخل التطبيق… (حجمها كبير، قد تستغرق ثواني)
        </div>
      ) : null}

      {usedEmbed && !videoError ? (
        <div className="why on" style={{ borderColor: "var(--neon)", background: "rgba(46,230,214,.1)", fontSize: 15 }}>
          ℹ️ يُعرض الفيديو من النسخة المضمّنة داخل التطبيق لأن ملفات{" "}
          <code dir="ltr">public/media</code> غير متوفرة على هذه الاستضافة — الشرح يعمل بالكامل.
        </div>
      ) : null}

      {videoError ? (
        <div
          className="why on"
          style={{
            borderColor: "var(--bad)",
            background: "rgba(255,77,109,.12)",
            fontSize: 17,
            lineHeight: 2,
          }}
        >
          ⚠️ تعذّر تحميل فيديو شرح الدرس من المسار: <code dir="ltr">{VIDEO_SRC}</code>
          <br />
          السبب الأغلب أن ملفات الوسائط لم تُرفع مع المشروع. تأكد من وجود المجلد{" "}
          <code dir="ltr">public/media</code> (وفيه <code dir="ltr">video.mp4</code> و١١ صورة) داخل
          المستودع المرتبط بـ Vercel، ثم أعد النشر.
          <br />
          وإن كنت تستضيف الوسائط خارجيًا فاضبط المتغير{" "}
          <code dir="ltr">NEXT_PUBLIC_MEDIA_BASE</code> على رابط الاستضافة.
          <br />
          <a href="/media-check" style={{ color: "var(--neon)", fontWeight: 900 }}>
            🩺 افتح صفحة الفحص /media-check لمعرفة الملف الناقص بدقة
          </a>
        </div>
      ) : null}

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
              <SafeImg src={c.src} alt={c.t} emoji={c.e || "🖼️"} embedKey={c.img} />
            ) : (
              <div style={{ fontSize: 80, textAlign: "center", paddingTop: 14 }}>{c.e}</div>
            )}
            <div className="b">
              <h3>{c.t}</h3>
              <p className={c.ay ? "ay" : undefined} dangerouslySetInnerHTML={{ __html: c.x }} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
