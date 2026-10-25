"use client";

import { useState } from "react";

/**
 * صورة مع بديل واضح عند فشل التحميل — حتى لا تظهر مربعات فارغة
 * إذا لم يُرفع مجلد public/media إلى الاستضافة.
 */
export default function SafeImg({
  src,
  alt,
  emoji = "🖼️",
  wide = false,
}: {
  src: string;
  alt: string;
  emoji?: string;
  wide?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        style={{
          width: "100%",
          aspectRatio: wide ? undefined : "16 / 9",
          minHeight: wide ? 120 : undefined,
          display: "grid",
          placeItems: "center",
          gap: 6,
          background: "rgba(255,77,109,.12)",
          border: "1px dashed rgba(255,77,109,.6)",
          color: "var(--ink)",
          textAlign: "center",
          padding: 12,
        }}
      >
        <span style={{ fontSize: 56 }}>{emoji}</span>
        <span style={{ fontSize: 14, color: "var(--mut)" }}>
          تعذّر تحميل الصورة — تأكد من رفع ملفات <code dir="ltr">public/media</code>
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onError={() => setFailed(true)} />
  );
}
