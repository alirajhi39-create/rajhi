import Link from "next/link";
import { getPublicWorksheet } from "@/lib/worksheet";
import WorksheetClient from "./WorksheetClient";

export const dynamic = "force-dynamic";

export default function WorksheetPage() {
  const worksheet = getPublicWorksheet();

  return (
    <main className="mx-auto w-full max-w-5xl px-3 pb-24 pt-5 sm:px-6 sm:pt-8">
      <div className="no-print mb-4 flex items-center justify-between text-sm">
        <Link
          href="/"
          className="rounded-xl bg-white px-4 py-2 font-bold text-navy-700 shadow-sm ring-1 ring-navy-100 transition hover:bg-navy-50"
        >
          ← الصفحة الرئيسة
        </Link>
        <Link
          href="/teacher"
          className="rounded-xl px-4 py-2 font-bold text-slate-500 transition hover:text-navy-700"
        >
          دخول المعلم
        </Link>
      </div>

      <WorksheetClient worksheet={worksheet} />
    </main>
  );
}
