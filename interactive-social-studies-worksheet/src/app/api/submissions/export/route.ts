import { desc } from "drizzle-orm";
import { db } from "@/db";
import { submissions } from "@/db/schema";
import { isTeacherAuthed, unauthorized } from "@/lib/teacher-auth";

export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

export async function GET() {
  if (!(await isTeacherAuthed())) return unauthorized();

  const rows = await db.select().from(submissions).orderBy(desc(submissions.createdAt));

  const header = [
    "م",
    "اسم الطالب",
    "الفصل",
    "المدرسة",
    "الدرجة النهائية (تصحيح إلكتروني)",
    "من",
    "عدد الإجابات الصحيحة",
    "زمن الحل (دقيقة)",
    "روجعت من المعلم",
    "ملاحظة المعلم",
    "تاريخ الإرسال",
  ];

  const lines = [header.map(csvCell).join(",")];
  rows.forEach((row, index) => {
    lines.push(
      [
        index + 1,
        row.studentName,
        row.studentClass,
        row.schoolName ?? "",
        row.totalScore,
        row.maxScore,
        row.correctCount,
        Math.round(row.durationSeconds / 60),
        row.teacherReviewed ? "نعم" : "لا",
        row.teacherNote ?? "",
        new Date(row.createdAt).toLocaleString("ar-SA"),
      ]
        .map(csvCell)
        .join(","),
    );
  });

  const csv = "\uFEFF" + lines.join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="results-grade6-2.csv"`,
    },
  });
}
