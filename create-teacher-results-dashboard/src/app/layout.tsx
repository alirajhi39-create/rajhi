import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./lesson.css";

export const metadata: Metadata = {
  title: "درس التيمم",
  description:
    "درس التيمم — دراسات إسلامية، الصف الثالث الابتدائي، المعلم علي راجحي. شرح بالفيديو واختبار تفاعلي مع لوحة معلم لمتابعة نتائج الطلاب.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&family=Lalezar&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
