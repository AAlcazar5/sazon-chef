// frontend/lib/voice/donateSiriShortcut.ts
//
// Y-Siri-2 (founder Telegram 2026-05-22) — donation API for Siri /
// Shortcuts surfacing. Apple's docs recommend donating an `INIntent`
// (or modern App Intent) after every successful invocation in the app
// so iOS surfaces the shortcut as a Siri suggestion later. This file
// is the JS-side caller; the native module that actually donates the
// intent lives in the iOS prebuild output (added by
// `plugins/withSazonAppIntents.js`).
//
// Wire points:
//   - Right after the wedge fires a successful recipe card (the user
//     said "tacos recipe" and got a card), call `donateRecipeAsk("tacos
//     recipe")`. iOS learns "the user often asks Sazon for X" → adds
//     "Ask Sazon for tacos" as a Siri suggestion next time the user
//     opens Siri.
//   - On platforms other than iOS, this is a silent no-op.
//
// Until the manual Xcode hookup lands (see plugins/withSazonAppIntents.js
// for the handoff), this function is a stub that logs the donation
// intent in dev mode and otherwise returns silently. The contract is
// stable so callers can wire it now and benefit when the native
// module ships.

import { Platform } from 'react-native';

interface DonateOptions {
  /** Free-text query the user spoke or typed. Used as the donated
   *  intent's `query` parameter so the next Siri suggestion is shaped
   *  like the user's actual ask. */
  query: string;
  /** Optional locale hint — defaults to the device locale. Currently
   *  unused by the stub; reserved for the native module's localized
   *  phrase catalog (Y-Siri-2 i18n). */
  locale?: string;
}

/**
 * Donate a Siri Shortcut representing a recipe ask. Best-effort: never
 * throws, always returns a promise that resolves with whether the
 * donation actually fired (true if the native bridge was available,
 * false if the call was a no-op).
 */
export async function donateRecipeAsk(options: DonateOptions): Promise<boolean> {
  const query = options.query.trim();
  if (query.length === 0) return false;
  if (Platform.OS !== 'ios') return false;

  // The native module will live at NativeModules.SazonAppIntents once
  // the Swift bridge is wired in Xcode. Until then, this function is a
  // silent no-op in production + a dev-mode log so callers can verify
  // their wire points fire at the right moment.
  try {
    // Lazy require avoids loading the native module bridge on Android
    // or web. If the bridge isn't registered yet, this throws and we
    // fall through to the dev-log path.
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { NativeModules } = require('react-native') as typeof import('react-native');
    const native = (NativeModules as Record<string, unknown>).SazonAppIntents as
      | { donateRecipeAsk?: (q: string) => Promise<boolean> }
      | undefined;
    if (native && typeof native.donateRecipeAsk === 'function') {
      return await native.donateRecipeAsk(query);
    }
  } catch {
    /* fall through */
  }

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[SazonAppIntents] donate stub:', query);
  }
  return false;
}
