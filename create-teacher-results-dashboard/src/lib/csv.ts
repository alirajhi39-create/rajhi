import { db } from "@/db";
import { attempts, type AnswerRecord } from "@/db/schema";
import { QUESTIONS } from "@/lib/lesson";
import { desc } from "drizzle-orm";

const stamp = (d: Date) => new Date(d).toLocaleString("sv-SE");
const esc = (v: string | number) => {
  const s = String(v ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const arabicDigits = (n: number) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);

/** يبني ملف CSV لتحليل الأسئلة أو لنتائج الطلاب */
export async function buildCsv(type: string): Promise<{ csv: string; filename: string }> {
  const rows = await db.select().from(attempts).orderBy(desc(attempts.createdAt)).limit(5000);

  if (type === "questions") {
    const head = [
      "م",
      "نص السؤال",
      "الإجابة الصحيحة",
      "عدد المحاولات",
      "إجابات صحيحة",
      "إجابات خاطئة",
      "كشف الإجابة",
      "نسبة النجاح %",
      "متوسط زمن السؤال (ث)",
      "أكثر إجابة خاطئة",
    ];
    let csv = head.join(",") + "\n";
    QUESTIONS.forEach((q, qi) => {
      let n = 0;
      let ok = 0;
      let rev = 0;
      let ms = 0;
      const wrong: Record<number, number> = {};
      for (const r of rows) {
        const a = (r.answers as AnswerRecord[] | null)?.find((x) => x.qi === qi);
        if (!a) continue;
        n += 1;
        ms += a.ms || 0;
        if (a.ok) ok += 1;
        else if (a.revealed) rev += 1;
        else if (a.picked >= 0) wrong[a.picked] = (wrong[a.picked] || 0) + 1;
      }
      const top = Object.entries(wrong).sort((a, b) => b[1] - a[1])[0];
      csv +=
        [
          qi + 1,
          esc(q.q),
          esc(q.a[0]),
          n,
          ok,
          n - ok - rev,
          rev,
          n ? Math.round((ok / n) * 100) : 0,
          n ? Math.round(ms / n / 1000) : 0,
          esc(top ? `${q.a[Number(top[0])] ?? ""} (${top[1]})` : "—"),
        ].join(",") + "\n";
    });
    return { csv, filename: "questions-analysis.csv" };
  }

  const head = [
    "م",
    "التاريخ",
    "اسم الطالب",
    "الصف/الشعبة",
    "الإجابات الصحيحة",
    "عدد الأسئلة",
    "النسبة %",
    "النقاط",
    "الزمن الكلي (ث)",
    "كشف الإجابة",
    ...QUESTIONS.map((_q, i) => `س${arabicDigits(i + 1)}`),
  ];
  let csv = head.join(",") + "\n";
  rows.forEach((r, i) => {
    const list = (r.answers as AnswerRecord[] | null) ?? [];
    const marks = QUESTIONS.map((_q, qi) => {
      const a = list.find((x) => x.qi === qi);
      if (!a) return "—";
      if (a.ok) return "صحيح";
      if (a.revealed) return "مكشوفة";
      if (a.skipped) return "لم يُجب";
      return `خطأ: ${QUESTIONS[qi].a[a.picked] ?? ""}`;
    });
    csv +=
      [
        i + 1,
        esc(stamp(r.createdAt)),
        esc(r.studentName),
        esc(r.studentClass || "—"),
        r.correct,
        r.total,
        r.total ? Math.round((r.correct / r.total) * 100) : 0,
        r.score,
        Math.round(r.durationMs / 1000),
        r.revealedCount,
        ...marks.map(esc),
      ].join(",") + "\n";
  });
  return { csv, filename: "students-results.csv" };
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
