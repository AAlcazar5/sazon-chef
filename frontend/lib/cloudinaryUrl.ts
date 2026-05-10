// P3: Cloudinary URL transform helper.
//
// Inject f_auto, q_auto, and explicit width/height/dpr into Cloudinary
// delivery URLs so each consumer fetches a right-sized variant instead of
// the original 1500px+ upload. Non-Cloudinary URLs pass through untouched
// (use optimizedImageUrl for Unsplash).
//
// Idempotent: if the URL already has a transform segment, we replace it
// rather than stack a second one.

const CLOUDINARY_HOST_RE =
  /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/(?:image|video|raw)\/upload\/)/;
// Match a transform segment — Cloudinary transforms are short tokens like
// `w_400`, `q_auto`, `f_auto`, `c_fill`, `dpr_2`, joined by commas.
const TRANSFORM_SEG_RE = /^[a-z]+_[^/,]+(?:,[a-z]+_[^/,]+)*$/i;

interface CldOptions {
  width?: number;
  height?: number;
  dpr?: number;
}

export function cldUrl(
  url: string | null | undefined,
  opts: CldOptions = {},
): string {
  if (!url) return '';
  const match = url.match(CLOUDINARY_HOST_RE);
  if (!match) return url;

  const base = match[1];
  const rest = url.slice(base.length);

  const parts: string[] = ['f_auto', 'q_auto'];
  if (opts.width) parts.push(`w_${Math.round(opts.width)}`);
  if (opts.height) parts.push(`h_${Math.round(opts.height)}`);
  if (opts.width && opts.height) parts.push('c_fill');
  if (opts.dpr) parts.push(`dpr_${opts.dpr}`);
  const newTransforms = parts.join(',');

  const slashIdx = rest.indexOf('/');
  const firstSeg = slashIdx >= 0 ? rest.slice(0, slashIdx) : rest;
  const remainder = slashIdx >= 0 ? rest.slice(slashIdx + 1) : '';

  if (TRANSFORM_SEG_RE.test(firstSeg)) {
    return `${base}${newTransforms}/${remainder}`;
  }
  return `${base}${newTransforms}/${rest}`;
}
