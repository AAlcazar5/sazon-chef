/**
 * Resize Unsplash images by appending a width cap to the URL.
 *
 * Unsplash image URLs are Imgix-compatible. Without a `w=` param, Unsplash
 * serves the original photo (often 4000-6000px wide) regardless of display size.
 * Appending `&w=N` caps the download — e.g. `w=800` is enough for 2× Retina
 * display on a 400px card.
 *
 * @param url   Raw imageUrl from the recipe record (may be null/undefined)
 * @param width Max pixel width to request (default 800 — suitable for most cards)
 */
export function optimizedImageUrl(url: string | undefined | null, width = 800): string {
  if (!url) return '';
  if (!url.includes('images.unsplash.com')) return url;
  // Don't double-add if already sized
  if (/[?&]w=\d/.test(url)) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}w=${width}`;
}
