// backend/src/config/locales.ts
// K10: single source of truth for the BCP 47 locale tags Sazon ships a coach
// persona for. Both /user/locale and /user/coach-locale validate against this
// set; bilingual users can override one without affecting the other.
//
// Adding a locale here ships it everywhere: route validation, error response
// payloads, future onboarding pickers.

export const SUPPORTED_LOCALES: ReadonlySet<string> = new Set([
  'en',
  'es',
  'es-MX',
  'es-AR',
  'es-CO',
  'es-ES',
  'es-419',
  'pt',
  'pt-BR',
  'pt-PT',
  'fr',
  'fr-CA',
]);
