#!/usr/bin/env node
/**
 * إعادة توليد وسائط الدرس (الفيديو + ١١ صورة) داخل public/media
 * عن طريق تنزيلها من موقع الدرس الأصلي وفكّ التضمين (base64).
 *
 * لماذا؟ لأن هذه الملفات كبيرة ولا تنتقل أحيانًا مع المستودع، فيظهر الفيديو
 * والصور معطّلة على Vercel. شغّل هذا السكربت على جهازك ثم التزم النتيجة في Git.
 *
 * الاستخدام:
 *   node scripts/fetch-media.mjs
 *   node scripts/fetch-media.mjs --from https://altyammum.vercel.app/
 */
import { mkdirSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const fromIdx = args.indexOf("--from");
const SOURCE = fromIdx >= 0 && args[fromIdx + 1] ? args[fromIdx + 1] : "https://altyammum.vercel.app/";
const OUT = join(process.cwd(), "public", "media");

const EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

const mb = (b) => `${(b / 1024 / 1024).toFixed(2)} MB`;

function decode(dataUrl) {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta.slice(5).split(";")[0];
  return { mime, ext: EXT[mime] ?? "bin", buf: Buffer.from(b64, "base64") };
}

async function main() {
  console.log(`\n⬇️  المصدر: ${SOURCE}`);
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`تعذّر تنزيل المصدر (HTTP ${res.status})`);
  const html = await res.text();
  console.log(`   حجم الصفحة: ${mb(html.length)}`);

  mkdirSync(OUT, { recursive: true });
  let count = 0;
  let total = 0;

  // الصور: const IMG={i1:'data:image/jpeg;base64,...', ...}
  const imgStart = html.indexOf("const IMG={");
  if (imgStart < 0) throw new Error("لم أجد كتلة الصور (const IMG) في المصدر");
  const imgEnd = html.indexOf("};", imgStart);
  const imgBlock = html.slice(imgStart, imgEnd);
  const pairs = [...imgBlock.matchAll(/(\w+):'(data:[^']+)'/g)];
  if (!pairs.length) throw new Error("لم أجد أي صورة مضمّنة");

  for (const [, key, dataUrl] of pairs) {
    const { ext, buf } = decode(dataUrl);
    const file = join(OUT, `${key}.${ext}`);
    writeFileSync(file, buf);
    total += buf.length;
    count += 1;
    console.log(`   ✅ ${key}.${ext}  ${mb(buf.length)}`);
  }

  // الفيديو: const VIDEO_SRC='data:video/mp4;base64,...'
  const m = /const VIDEO_SRC='(data:[^']+)'/.exec(html);
  if (m) {
    const { ext, buf } = decode(m[1]);
    const file = join(OUT, `video.${ext}`);
    writeFileSync(file, buf);
    total += buf.length;
    count += 1;
    console.log(`   ✅ video.${ext}  ${mb(buf.length)}`);
  } else {
    console.warn("   ⚠️  لم أجد الفيديو مضمّنًا في المصدر");
  }

  console.log(`\n📦 ${count} ملفًا • الحجم الكلي ${mb(total)}`);
  console.log(`📂 المسار: ${OUT}`);

  const missing = ["video.mp4", ...Array.from({ length: 11 }, (_, i) => `i${i + 1}.jpg`)].filter(
    (f) => !existsSync(join(OUT, f)),
  );
  if (missing.length) {
    console.error(`\n❌ ما زال ناقصًا: ${missing.join(", ")}`);
    process.exit(1);
  }

  console.log("\n✅ الوسائط جاهزة. الخطوة التالية:");
  console.log("   git add public/media");
  console.log('   git commit -m "add lesson media (video + images)"');
  console.log("   git push   ← ثم أعد النشر على Vercel\n");
  console.log(`   للتحقق بعد النشر افتح: /media-check`);
  const size = statSync(join(OUT, "video.mp4")).size;
  console.log(`   حجم الفيديو المرفوع: ${mb(size)}\n`);
}

main().catch((e) => {
  console.error(`\n❌ ${e.message}\n`);
  process.exit(1);
});
