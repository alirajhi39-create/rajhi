"use client";

import { useEffect, useState } from "react";
import { embeddedSizes } from "@/lib/embeddedMedia";

/**
 * يفحص الوسائط من داخل المتصفح نفسه — وهي أدق نتيجة، لأنها نفس الطريقة
 * التي يحمّل بها الطالب الفيديو والصور في صفحة الدرس.
 */

const IMAGES = Array.from({ length: 11 }, (_, i) => `i${i + 1}.jpg`);
const FILES = ["video.mp4", ...IMAGES];

type Row = {
  file: string;
  url: string;
  status: number;
  type: string;
  size: number;
  loads: boolean | null;
  note: string;
};

const mb = (b: number) => (b ? `${(b / 1024 / 1024).toFixed(2)} MB` : "—");

async function fetchInfo(url: string) {
  try {
    const res = await fetch(url, { cache: "no-store", headers: { Range: "bytes=0-1023" } });
    const range = res.headers.get("content-range") ?? "";
    const total = range.includes("/") ? Number(range.split("/")[1]) : 0;
    return {
      status: res.status,
      type: res.headers.get("content-type") ?? "",
      size: total || Number(res.headers.get("content-length") ?? 0),
    };
  } catch {
    return { status: 0, type: "", size: 0 };
  }
}

function loadsImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const im = new Image();
    const done = (v: boolean) => resolve(v);
    im.onload = () => done(true);
    im.onerror = () => done(false);
    im.src = url;
    setTimeout(() => done(false), 12000);
  });
}

function loadsVideo(url: string): Promise<{ ok: boolean; note: string }> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    let settled = false;
    const finish = (ok: boolean, note: string) => {
      if (settled) return;
      settled = true;
      v.src = "";
      resolve({ ok, note });
    };
    v.onloadedmetadata = () =>
      finish(true, `المدة ${Math.round(v.duration || 0)} ثانية • ${v.videoWidth}×${v.videoHeight}`);
    v.onerror = () => finish(false, "رفض المتصفح تحميل المقطع");
    v.src = url;
    setTimeout(() => finish(false, "انتهت مهلة التحميل (١٢ ثانية)"), 12000);
  });
}

export default function MediaProbe({ base }: { base: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(true);
  const [embed, setEmbed] = useState<{ images: number; video: number } | null>(null);
  const [embedBusy, setEmbedBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: Row[] = [];
      for (const file of FILES) {
        const url = `${base}/media/${file}`;
        const info = await fetchInfo(url);
        const okHttp = info.status === 200 || info.status === 206;
        let loads: boolean | null = null;
        let note = "";
        if (file.endsWith(".jpg")) {
          loads = okHttp ? await loadsImage(url) : false;
          note = loads ? "تظهر في المتصفح" : okHttp ? "نُزّلت لكن تعذّر عرضها" : "غير موجودة";
        } else {
          const r = okHttp ? await loadsVideo(url) : { ok: false, note: "غير موجود" };
          loads = r.ok;
          note = r.note;
        }
        out.push({ file, url, ...info, loads, note });
        if (!cancelled) setRows([...out]);
      }
      if (!cancelled) setBusy(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [base]);

  const done = rows ?? [];
  const okCount = done.filter((r) => r.loads).length;
  const video = done.find((r) => r.file === "video.mp4");

  return (
    <>
      <div className="dt-grid">
        <div className={`dt-kpi ${!busy && okCount === FILES.length ? "g" : okCount ? "y" : "r"}`}>
          <b>
            {okCount}/{FILES.length}
          </b>
          <span>ملفات تعمل في المتصفح {busy ? "(جارٍ الفحص…)" : ""}</span>
        </div>
        <div className={`dt-kpi ${video ? (video.loads ? "g" : "r") : ""}`}>
          <b>{video ? (video.loads ? "يعمل" : "لا يعمل") : "…"}</b>
          <span>فيديو الشرح</span>
        </div>
        <div className="dt-kpi">
          <b>{video ? mb(video.size) : "—"}</b>
          <span>حجم الفيديو على الخادم</span>
        </div>
        <div className="dt-kpi p">
          <b>{done.filter((r) => r.status === 404).length}</b>
          <span>ملفات تعيد 404 (غير مرفوعة)</span>
        </div>
      </div>

      <div className="dt-tablewrap" style={{ marginTop: 14 }}>
        <table className="dt-table">
          <thead>
            <tr>
              <th>الملف</th>
              <th>HTTP</th>
              <th>النوع</th>
              <th>الحجم</th>
              <th>في المتصفح</th>
              <th>الرابط</th>
            </tr>
          </thead>
          <tbody>
            {FILES.map((f) => {
              const r = done.find((x) => x.file === f);
              return (
                <tr key={f}>
                  <td>
                    <b>{f}</b>
                  </td>
                  <td>
                    <span className={`dt-pill ${r && r.status >= 200 && r.status < 300 ? "ok" : r ? "no" : "mid"}`}>
                      {r ? (r.status || "فشل") : "…"}
                    </span>
                  </td>
                  <td>{r?.type || "—"}</td>
                  <td>{r ? mb(r.size) : "—"}</td>
                  <td className="wrap">
                    {r ? (
                      <span style={{ color: r.loads ? "var(--ok)" : "var(--bad)" }}>
                        {r.loads ? "✅ " : "❌ "}
                        {r.note}
                      </span>
                    ) : (
                      "جارٍ الفحص…"
                    )}
                  </td>
                  <td className="wrap">
                    <code dir="ltr" style={{ fontSize: 12 }}>
                      {`${base}/media/${f}`}
                    </code>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="dt-panel" style={{ marginTop: 14, borderColor: "var(--neon)" }}>
        <h2>🧪 النسخة المضمّنة الاحتياطية (داخل الكود)</h2>
        <p className="dt-note" style={{ marginBottom: 10 }}>
          حتى لو كانت الملفات أعلاه تعيد <b>404</b>، صفحة الدرس تحوّل تلقائيًا إلى نسخة مضمّنة داخل
          التطبيق (نفس طريقة الموقع القديم)، فيظهر الفيديو والصور للطلاب. اضغط الفحص للتأكد من وجودها
          — التنزيل بحجم كبير فافحصه مرة واحدة فقط.
        </p>
        <div className="dt-row">
          <button
            className="dt-btn ghost sm"
            type="button"
            disabled={embedBusy}
            onClick={async () => {
              setEmbedBusy(true);
              const sizes = await embeddedSizes();
              setEmbed(sizes);
              setEmbedBusy(false);
            }}
          >
            {embedBusy ? "جارٍ الفحص…" : "🧪 فحص النسخة المضمّنة"}
          </button>
          {embed ? (
            <span className="dt-note">
              الصور:{" "}
              <b style={{ color: embed.images ? "var(--ok)" : "var(--bad)" }}>
                {embed.images ? mb(embed.images) : "غير متوفرة"}
              </b>{" "}
              • الفيديو:{" "}
              <b style={{ color: embed.video ? "var(--ok)" : "var(--bad)" }}>
                {embed.video ? mb(embed.video) : "غير متوفر"}
              </b>
            </span>
          ) : null}
        </div>
      </div>

      {!busy ? (
        okCount === FILES.length ? (
          <div className="dt-panel" style={{ borderColor: "var(--ok)" }}>
            <h2>✅ كل الوسائط تعمل في هذا المتصفح</h2>
            <p className="dt-note">
              الفيديو والصور تُحمَّل بنجاح من النشرة الحالية. إن لم تظهر داخل صفحة الدرس فامسح ذاكرة
              المتصفح المؤقتة أو جرّب نافذة خاصة.
            </p>
          </div>
        ) : (
          <div className="dt-panel" style={{ borderColor: "var(--bad)" }}>
            <h2>❌ بعض الوسائط غير متاحة في هذه النشرة</h2>
            <p className="dt-note" style={{ fontSize: 15 }}>
              الملفات التي تعيد <b>404</b> يعني أنها لم تُرفع مع المشروع. الحل من جهازك:
            </p>
            <ol className="dt-note" style={{ fontSize: 15, lineHeight: 2.2 }}>
              <li>
                أعد توليد الوسائط: <code dir="ltr">node scripts/fetch-media.mjs</code>
              </li>
              <li>
                تحقق: <code dir="ltr">node scripts/check-media.mjs</code>
              </li>
              <li>
                <code dir="ltr">git add public/media</code> ثم <code dir="ltr">git commit</code> ثم{" "}
                <code dir="ltr">git push</code>
              </li>
              <li>
                في Vercel تأكد من <b>Root Directory</b> وأنه يشير للمجلد الذي يحوي{" "}
                <code dir="ltr">package.json</code> و<code dir="ltr">public/</code> معًا.
              </li>
              <li>أعد النشر ثم افتح هذه الصفحة مرة أخرى.</li>
            </ol>
            <p className="dt-note" style={{ marginTop: 10 }}>
              بديل بدون Git: ارفع الوسائط إلى Vercel Blob أو أي CDN واضبط{" "}
              <code dir="ltr">NEXT_PUBLIC_MEDIA_BASE</code> على رابطها.
            </p>
          </div>
        )
      ) : null}
    </>
  );
}
