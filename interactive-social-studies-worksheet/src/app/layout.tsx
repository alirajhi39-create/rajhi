import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Tajawal } from "next/font/google";
import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800", "900"],
  display: "swap",
  variable: "--font-tajawal",
});

export const metadata: Metadata = {
  title: "ورقة عمل تفاعلية | تأسيس الدولة السعودية الثانية - الصف السادس 6/2",
  description:
    "ورقة عمل إلكترونية تفاعلية لمادة الدراسات الاجتماعية - الدرس السابع: تأسيس الدولة السعودية الثانية، تُحلّ أونلاين وتُرسل النتيجة للمعلم مباشرة. الدرجة من 20.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={tajawal.variable}>
      <body className="min-h-screen bg-[#f3f6fb] font-sans text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
