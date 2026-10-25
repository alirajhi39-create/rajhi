"use client";

import { useEffect, useState } from "react";
import { embeddedImage } from "@/lib/embeddedMedia";

/**
 * صورة مع نسخة احتياطية مضمّنة: إن فشل تحميل الملف من public/media
 * تُعرض الصورة من النسخة المضمّنة داخل الكود، وإن فشلت الاثنتان يظهر تنبيه.
 */
export default function SafeImg({
  src,
  alt,
  emoji = "🖼️",
  embedKey,
}: {
  src: string;
  alt: string;
  emoji?: string;
  embedKey?: string;
}) {
  const [current, setCurrent] = useState(src);
  const [failed, setFailed] = useState(false);
  const [usedEmbed, setUsedEmbed] = useState(false);

  useEffect(() => {
    setCurrent(src);
    setFailed(false);
    setUsedEmbed(false);
  }, [src]);

  async function onError() {
    if (usedEmbed) {
      setFailed(true);
      return;
    }
    const key = embedKey || /\/(i\d+)\.[a-z]+$/i.exec(src)?.[1] || null;
    const data = await embeddedImage(key);
    if (data) {
      setUsedEmbed(true);
      setFailed(false);
      setCurrent(data);
    } else {
      setFailed(true);
    }
  }

  if (failed) {
    return (
      <div
        style={{
          width: "100%",
          aspectRatio: "16 / 9",
          display: "grid",
          placeItems: "center",
          background: "rgba(255,77,109,.12)",
          border: "1px dashed rgba(255,77,109,.6)",
          textAlign: "center",
          padding: 12,
          gap: 6,
        }}
      >
        <span style={{ fontSize: 56 }}>{emoji}</span>
        <span style={{ fontSize: 14, color: "var(--mut)" }}>تعذّر تحميل الصورة</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={current} alt={alt} onError={() => void onError()} />
  );
}
