#!/usr/bin/env node
/**
 * توليد النسخة المضمّنة من الوسائط داخل الكود:
 *   src/lib/embed/images.ts  و  src/lib/embed/video.ts
 * شغّله بعد أي تغيير في public/media.
 *   node scripts/build-embed.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const media = join(process.cwd(), "public", "media");
const out = join(process.cwd(), "src", "lib", "embed");
if (!existsSync(media)) {
  console.error("❌ لا يوجد public/media — شغّل أولًا: node scripts/fetch-media.mjs");
  process.exit(1);
}
mkdirSync(out, { recursive: true });
const mb = (b) => `${(b / 1024 / 1024).toFixed(2)} MB`;

const keys = Array.from({ length: 11 }, (_, i) => `i${i + 1}`);
let img = "/* ملف مولّد آليًا من وسائط الدرس — لا تعدّله يدويًا */\nconst IMAGES: Record<string, string> = {\n";
let imgBytes = 0;
for (const k of keys) {
  const buf = readFileSync(join(media, `${k}.jpg`));
  imgBytes += buf.length;
  const b64 = buf.toString("base64");
  img += `  "${k}":\n`;
  for (let i = 0; i < b64.length; i += 120) {
    img += `    "${b64.slice(i, i + 120)}"` + (i + 120 < b64.length ? " +\n" : ",\n");
  }
}
img += "};\n\nexport default IMAGES;\n";
writeFileSync(join(out, "images.ts"), img);
console.log(`✅ images.ts — ${keys.length} صورة (${mb(imgBytes)})`);

const vbuf = readFileSync(join(media, "video.mp4"));
const v64 = vbuf.toString("base64");
const CH = 700000;
let v = "/* ملف مولّد آليًا من وسائط الدرس — لا تعدّله يدويًا */\n";
v += "// الفيديو مقسّم إلى أجزاء لتفادي حرف نصي عملاق واحد، ويُجمَّع عند الطلب فقط\n";
v += "const PARTS: string[] = [\n";
for (let i = 0; i < v64.length; i += CH) v += `  "${v64.slice(i, i + CH)}",\n`;
v += '];\n\nexport const VIDEO_DATA_URL = "data:video/mp4;base64," + PARTS.join("");\n';
writeFileSync(join(out, "video.ts"), v);
console.log(`✅ video.ts — فيديو (${mb(vbuf.length)})`);
console.log("\nالآن: git add src/lib/embed public/media && git commit && git push");
