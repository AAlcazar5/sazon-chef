// frontend/lib/sazonAlert.ts
// ROADMAP 4.0 U16 — i18n-aware Alert wrapper.
//
// Pre-U16: 161 raw `Alert.alert('Oops!', 'Couldn't load that...')` sites
// shipped English-only strings, bypassing the t() helper that the rest of
// the app uses. Spanish / Portuguese / French users saw English alerts.
//
// Post-U16: every alert goes through `sazonAlert(titleKey, bodyKey)` or
// the literal-passthrough form `sazonAlertRaw(title, body)` for cases
// that legitimately can't translate (e.g. interpolated server-error text
// that's already in the user's locale). The ratchet test
// (`alertI18nCoverage.test.ts`) pins the floor at the current count of
// raw `Alert.alert('...'...)` literals — new code MUST use sazonAlert.

import { Alert, type AlertButton } from 'react-native';
import { t } from './i18n';

interface SazonAlertOptions {
  /** Optional buttons (cancel + action). Defaults to a single OK button. */
  buttons?: AlertButton[];
  /** Interpolation values forwarded to `t()`. */
  values?: Record<string, string | number>;
}

/**
 * Show a translated alert. `titleKey` and `bodyKey` are i18n keys (e.g.
 * `'errors.image_load.title'`, `'errors.image_load.body'`).
 */
export function sazonAlert(
  titleKey: string,
  bodyKey: string,
  options: SazonAlertOptions = {},
): void {
  const title = t(titleKey, options.values);
  const body = t(bodyKey, options.values);
  Alert.alert(title, body, options.buttons);
}

/**
 * Escape hatch for cases that can't translate (e.g. a server error message
 * the backend already localized for us). USE SPARINGLY — the U16 ratchet
 * counts `Alert.alert` literals + this helper's calls separately, and the
 * sazonAlertRaw count is what's locked at the floor.
 */
export function sazonAlertRaw(
  title: string,
  body: string,
  buttons?: AlertButton[],
): void {
  Alert.alert(title, body, buttons);
}
