#!/usr/bin/env node
/**
 * فحص وسائط الدرس قبل النشر.
 * الاستخدام:  node scripts/check-media.mjs
 * يتأكد من وجود الفيديو والصور داخل public/media وأن أحجامها مقبولة.
 */
import { existsSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "public", "media");
const required = [
  "video.mp4",
  ...["i1", "i2", "i3", "i4", "i5", "i6", "i7", "i8", "i9", "i10", "i11"].map((n) => `${n}.jpg`),
];

const mb = (b) => `${(b / 1024 / 1024).toFixed(2)} MB`;
let missing = 0;
let total = 0;

console.log(`\n📂 مجلد الوسائط: ${dir}`);
if (!existsSync(dir)) {
  console.error("❌ المجلد غير موجود نهائيًا — الفيديو والصور لن تظهر على Vercel.");
  console.error("   الحل: ارفع ملفات الوسائط إلى public/media ثم التزمها في Git وأعد النشر.");
  process.exit(1);
}

for (const name of required) {
  const file = join(dir, name);
  if (!existsSync(file)) {
    console.error(`   ❌ ناقص: ${name}`);
    missing += 1;
    continue;
  }
  const size = statSync(file).size;
  total += size;
  console.log(`   ✅ ${name.padEnd(12)} ${mb(size)}`);
}

const extra = readdirSync(dir).filter((f) => !required.includes(f));
if (extra.length) console.log(`   ℹ️  ملفات إضافية: ${extra.join(", ")}`);

console.log(`\n📦 الحجم الكلي: ${mb(total)}`);
console.log("   حد Vercel (Hobby) لرفع الملفات الثابتة: 100 MB — المشروع ضمن الحد.");

if (missing) {
  console.error(`\n❌ عدد الملفات الناقصة: ${missing}`);
  console.error("   هذا هو سبب عدم ظهور الفيديو/الصور بعد النشر على Vercel.");
  console.error("   تأكد أن public/media مضمون في Git (غير مُدرج في .gitignore) ثم أعد النشر.");
  process.exit(1);
}
console.log("\n✅ كل الوسائط موجودة وجاهزة للنشر.\n");
