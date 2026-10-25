/**
 * نسخة احتياطية مضمّنة من الوسائط داخل الكود نفسه.
 * تُحمَّل عند الطلب (dynamic import) فقط إذا فشلت الملفات في public/media،
 * فتعمل الصفحة حتى لو لم تُرفع الوسائط مع الاستضافة.
 */

export async function embeddedImage(key?: string | null): Promise<string | null> {
  if (!key) return null;
  try {
    const mod = await import("@/lib/embed/images");
    return mod.default[key] ?? null;
  } catch {
    return null;
  }
}

export async function embeddedVideo(): Promise<string | null> {
  try {
    const mod = await import("@/lib/embed/video");
    return mod.VIDEO_DATA_URL || null;
  } catch {
    return null;
  }
}

/** حجم النسخة المضمّنة تقريبًا بالبايت (لفحص /media-check) */
export async function embeddedSizes(): Promise<{ images: number; video: number }> {
  let images = 0;
  let video = 0;
  try {
    const mod = await import("@/lib/embed/images");
    images = Object.values(mod.default).reduce((s, v) => s + v.length, 0);
  } catch {
    images = 0;
  }
  try {
    const mod = await import("@/lib/embed/video");
    video = mod.VIDEO_DATA_URL.length;
  } catch {
    video = 0;
  }
  return { images, video };
}
