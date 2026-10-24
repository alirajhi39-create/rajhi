import Link from "next/link";
import TeacherDashboard from "./TeacherDashboard";

export const dynamic = "force-dynamic";

export default function TeacherPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-3 py-6 sm:px-6 sm:py-8">
      <div className="mb-5 flex items-center justify-between text-sm">
        <Link
          href="/"
          className="rounded-xl bg-white px-4 py-2 font-bold text-navy-700 shadow-sm ring-1 ring-navy-100 transition hover:bg-navy-50"
        >
          ← الصفحة الرئيسة
        </Link>
        <Link
          href="/worksheet"
          className="rounded-xl px-4 py-2 font-bold text-slate-500 transition hover:text-navy-700"
        >
          معاينة ورقة العمل
        </Link>
      </div>
      <TeacherDashboard />
    </main>
  );
}
