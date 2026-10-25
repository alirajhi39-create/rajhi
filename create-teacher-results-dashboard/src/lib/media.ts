/**
 * مسار الوسائط (فيديو الدرس وصوره).
 * افتراضيًا تُخدم من مجلد public/media داخل المشروع.
 * ويمكن استضافتها خارجيًا (Vercel Blob / CDN / أي رابط) بضبط المتغير:
 *   NEXT_PUBLIC_MEDIA_BASE=https://your-cdn.example.com
 * فيصبح الفيديو مثلًا: https://your-cdn.example.com/media/video.mp4
 */
const rawBase = process.env.NEXT_PUBLIC_MEDIA_BASE ?? "";

export const MEDIA_BASE = rawBase.replace(/\/+$/, "");

export function mediaUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${MEDIA_BASE}${p}`;
}
