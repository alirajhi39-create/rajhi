"use client";

import type { AnswerRecord, Attempt } from "@/db/schema";
import { QUESTIONS } from "@/lib/lesson";

const fmt = (d: string | Date) =>
  new Date(d).toLocaleString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const secs = (ms: number) => `${Math.max(0, Math.round(ms / 1000))} ثانية`;

export default function AttemptDetail({ row, onClose }: { row: Attempt; onClose: () => void }) {
  const answers = (row.answers as AnswerRecord[] | null) ?? [];
  const pct = row.total ? Math.round((row.correct / row.total) * 100) : 0;

  return (
    <div className="dt-modal" onClick={onClose} role="presentation">
      <div className="dt-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="dt-row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 className="dt-title" style={{ fontSize: 30 }}>
              {row.studentName}
            </h2>
            <div className="dt-sub">
              {row.studentClass || "بدون صف"} • {fmt(row.createdAt)}
            </div>
          </div>
          <button className="dt-btn ghost sm" type="button" onClick={onClose}>
            ✕ إغلاق
          </button>
        </div>

        <div className="dt-grid" style={{ marginTop: 14 }}>
          <div className="dt-kpi g">
            <b>
              {row.correct}/{row.total}
            </b>
            <span>الإجابات الصحيحة</span>
          </div>
          <div className="dt-kpi y">
            <b>{pct}%</b>
            <span>النسبة</span>
          </div>
          <div className="dt-kpi">
            <b>{row.score}</b>
            <span>النقاط</span>
          </div>
          <div className="dt-kpi p">
            <b>{secs(row.durationMs)}</b>
            <span>زمن الاختبار</span>
          </div>
        </div>

        <h2 style={{ marginTop: 18 }}>تفصيل إجابات الطالب</h2>
        {QUESTIONS.map((q, qi) => {
          const a = answers.find((x) => x.qi === qi);
          const state = !a || a.skipped ? "skip" : a.ok ? "ok" : a.revealed ? "rev" : "no";
          const cls = state === "ok" ? "dt-aq ok" : state === "no" ? "dt-aq no" : "dt-aq";
          return (
            <div className={cls} key={qi}>
              <div className="dt-row" style={{ justifyContent: "space-between", gap: 8 }}>
                <strong>
                  {qi + 1}. {q.q}
                </strong>
                {state === "ok" ? (
                  <span className="dt-pill ok">✓ صحيح</span>
                ) : state === "no" ? (
                  <span className="dt-pill no">✗ خطأ</span>
                ) : state === "rev" ? (
                  <span className="dt-pill mid">👁 كشف الإجابة</span>
                ) : (
                  <span className="dt-pill mid">— لم يُجب</span>
                )}
              </div>
              <p className="dt-muted">الإجابة الصحيحة: {q.a[0]}</p>
              {state === "no" && a && a.picked >= 0 ? (
                <p>
                  اختيار الطالب: <span style={{ color: "var(--bad)" }}>{q.a[a.picked] ?? "—"}</span>
                </p>
              ) : null}
              <p className="dt-muted" style={{ fontSize: 13 }}>
                ⏱ {a ? secs(a.ms) : "—"}
                {a?.got ? ` • ⭐ ${a.got} نقطة` : ""}
              </p>
              <p style={{ fontSize: 14 }}>💡 {q.why}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
