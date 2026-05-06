// ROADMAP 4.0 S3.2 — clean assistant text before passing to TTS so the
// speaker doesn't read "asterisk asterisk bold asterisk asterisk" or
// emoji noise. Pure helper — no I/O.

const MD_LINK = /\[([^\]]+)\]\([^)]+\)/g;
const MD_HEADERS = /(^|\n)\s*#{1,6}\s+/g;
const MD_BULLETS = /(^|\n)\s*[-*•]\s+/g;
const MD_INLINE_CODE = /`+/g;
const MD_BOLD_AST = /\*\*([^*]+)\*\*/g;
const MD_ITALIC_AST = /\*([^*\n]+)\*/g;
// Underscore emphasis only at non-alphanumeric boundaries so identifiers
// like `find_recipes` survive.
const MD_BOLD_UND = /(^|[^A-Za-z0-9])__([^_\n]+)__(?![A-Za-z0-9])/g;
const MD_ITALIC_UND = /(^|[^A-Za-z0-9])_([^_\n]+)_(?![A-Za-z0-9])/g;
// Strip Unicode emoji + ZWJ/variant selectors (Extended Pictographic
// covers faces, hands, food, flags).
const EMOJI = /[\p{Extended_Pictographic}‍️]/gu;

export function cleanForTts(text: string): string {
  if (!text) return '';
  let out = text;
  out = out.replace(MD_LINK, '$1');
  out = out.replace(MD_HEADERS, '$1');
  out = out.replace(MD_BULLETS, '$1');
  out = out.replace(MD_INLINE_CODE, '');
  out = out.replace(MD_BOLD_AST, '$1');
  out = out.replace(MD_ITALIC_AST, '$1');
  out = out.replace(MD_BOLD_UND, '$1$2');
  out = out.replace(MD_ITALIC_UND, '$1$2');
  out = out.replace(EMOJI, '');
  out = out.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return out;
}
