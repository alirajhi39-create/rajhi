# درس التيمم — شرح تفاعلي + اختبار + لوحة معلم

تطبيق Next.js (App Router) + PostgreSQL عبر Drizzle ORM.

- **`/`** صفحة الدرس: فيديو الشرح بنفس فصوله، بطاقات الشرح، واختبار تفاعلي من ١٠ أسئلة (نفس أسئلة الرابط الأصلي دون تغيير).
- **`/teacher`** لوحة المعلم: نتائج الطلاب، تحليل لكل سؤال، تصفية وبحث، تفاصيل إجابات كل طالب، وتصدير CSV.
- **`/api/attempts`** حفظ نتيجة الطالب (POST) وقراءة النتائج للمعلم (GET).

---

## أولًا: سبب عدم ظهور الفيديو والصور على Vercel

الفيديو والصور **ملفات محلية داخل المشروع** في المجلد:

```
public/media/video.mp4   (≈7.6 MB)
public/media/i1.jpg … i11.jpg
```

إذا لم تُرفع هذه الملفات مع المستودع، فالرابط `/media/video.mp4` يعيد **404** فيظهر مشغّل فارغ وصور محطّمة. أشهر الأسباب:

1. **المجلد غير مُلتزَم في Git** (أُضيف بعد آخر commit، أو كان مُدرجًا في `.gitignore`).
2. **النسخ إلى Vercel تم بمجلد `src` فقط** دون `public`.
3. **حجم الرفع تجاوز الحد** — حد Vercel لخطة Hobby هو **100 MB** للملفات الثابتة، وحجم وسائط هذا المشروع ≈ 7.6 MB أي ضمن الحد.
4. **فشل البناء** بسبب عدم ضبط `DATABASE_URL` في Vercel (كان العميل القديم يرمي خطأً عند الاستيراد؛ أُصلح الآن ليصبح التهيئة عند أول استعلام فقط).

### خطوات الإصلاح

```bash
# ١) تحقق أن الوسائط موجودة وكاملة
node scripts/check-media.mjs

# ٢) التزمها في Git
git add public/media .gitignore
git commit -m "add lesson media"
git push

# ٣) أعد النشر على Vercel
```

الآن أصبحت الصفحة **تُشخّص المشكلة بنفسها**: إذا فشل تحميل الفيديو تظهر رسالة عربية واضحة تحت المشغّل تذكر المسار المطلوب، وإذا فشلت أي صورة يظهر بديل يشير إلى `public/media`.

### استضافة الوسائط خارجيًا (اختياري)

إن رغبت برفع الفيديو إلى Vercel Blob أو أي CDN بدل المستودع:

```
NEXT_PUBLIC_MEDIA_BASE=https://your-store.public.blob.vercel-storage.com
```

فيصبح المسار `https://your-store.public.blob.vercel-storage.com/media/video.mp4` (حافظ على نفس أسماء الملفات داخل مجلد `media`).

---

## ثانيًا: ربط قاعدة Neon

### ١) أنشئ مشروعًا في Neon وانسخ رابطي الاتصال

```
# للتطبيق (مُجمَّع — pooled)
DATABASE_URL="postgresql://USER:PASS@ep-xxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require"

# للترحيل فقط (غير مُجمَّع — unpooled)
DATABASE_URL_UNPOOLED="postgresql://USER:PASS@ep-xxx.REGION.aws.neon.tech/neondb?sslmode=require"
```

### ٢) اضبطهما في Vercel

`Project → Settings → Environment Variables` أضف:

| المتغير | القيمة | ملاحظة |
|---|---|---|
| `DATABASE_URL` | رابط Neon المُجمَّع | إلزامي |
| `DATABASE_URL_UNPOOLED` | رابط Neon غير المُجمَّع | للترحيل (اختياري) |
| `TEACHER_PASSWORD` | كلمة مرور لوحة المعلم | افتراضيًا `1234` |
| `TEACHER_SECRET` | نص عشوائي طويل | لتشفير رمز الجلسة |
| `NEXT_PUBLIC_MEDIA_BASE` | رابط CDN | اختياري |

> لا يحتاج المشروع إلى `@neondatabase/serverless` إضافيًّا — مثبّت مسبقًا، والعميل في `src/db/index.ts` يختار تلقائيًا:
> **Neon → مشغّل HTTP** (بدون TCP وبدون إعداد SSL)، و**localhost → مشغّل `pg`**.

### ٣) أنشئ الجدول في Neon

```bash
npx drizzle-kit push
```

الجدول: `attempts` (اسم الطالب، الصف، عدد الإجابات الصحيحة، النقاط، الزمن، تفاصيل إجابة كل سؤال، التاريخ).

### ٤) تحقق

افتح `/api/health` — يجب أن يعيد `{"ok":true}`.

---

## النشر على Vercel (ملخّص)

1. ارفع المشروع إلى GitHub **بما فيه `public/media`**.
2. في Vercel: `Add New → Project → Import` المستودع.
3. أضف متغيرات البيئة أعلاه (خصوصًا `DATABASE_URL`).
4. `Deploy`، ثم نفّذ `npx drizzle-kit push` مرة واحدة لإنشاء الجدول.
5. افتح الموقع، ومن زر 👨‍🏫 في الترويسة ادخل لوحة المعلم.

---

## لوحة المعلم

- الدخول: `/teacher` ثم كلمة المرور، أو الدخول المباشر `/teacher?k=كلمة_المرور`.
- اللوحة تُبنى في الخادم والنتائج مضمّنة في الصفحة — تعمل حتى لو حجب المتصفح الكوكيز (داخل iframe مثلًا).
- ما تعرضه: عدد المحاولات والطلاب، متوسط النسبة، المتميزون والناجحون، أعلى نقاط، متوسط الزمن، أصعب سؤال، نسبة النجاح لكل سؤال وأكثر إجابة خاطئة شيوعًا، وجدول النتائج مع تفاصيل إجابات كل طالب.
- تحديث تلقائي كل ٢٠ ثانية (يمكن إيقافه)، وبحث/تصفية بالاسم والصف والفترة والترتيب.
- تصدير CSV: نتائج الطلاب (مع علامة لكل سؤال س١…س١٠) وتحليل الأسئلة — من `/teacher/export` أو `/api/export`.

---

## التطوير محليًا

```bash
npm install
# في ملف .env
# DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
npx drizzle-kit push
npm run dev
```

الفحوص: `npx next typegen` ثم `npx tsc --noEmit` ثم `npm run build`.
