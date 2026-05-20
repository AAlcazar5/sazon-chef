// frontend/lib/coach/handleVoiceCookCommand.ts
//
// Tier Y-Live-5 — voice nav in the step player. Pure dispatcher: a
// transcript is classified via resolveVoiceCookCommand (the W-C1 client-
// side resolver) and routed to the player's handlers. The player owns
// the hook integration (useVoiceInput → handleVoiceCookCommand → state);
// the dispatching logic is here so it's unit-testable without RN/hook
// mocking. Same shape as W-C1's planCookTurn.

import {
  resolveVoiceCookCommand,
  type VoiceCookCommand,
} from '../cooking/resolveVoiceCookCommand';

export interface VoiceCookHandlers {
  onNext: () => void;
  /** undefined on the first step (CookStepCard's contract). */
  onPrev?: () => void;
  /** TTS speaker — used by the `repeat` command to re-read the step. */
  speak: (text: string) => void;
  /** Current step body for "repeat". */
  currentStepText: string;
}

export function handleVoiceCookCommand(
  transcript: string,
  h: VoiceCookHandlers,
): VoiceCookCommand {
  const cmd = resolveVoiceCookCommand(transcript);
  switch (cmd.kind) {
    case 'step-nav':
      if (cmd.dir === 'next') h.onNext();
      else if (cmd.dir === 'prev' && h.onPrev) h.onPrev();
      break;
    case 'repeat':
      if (h.currentStepText) h.speak(h.currentStepText);
      break;
    // scale / freeform / none: the minimal player has no ingredient
    // context (scale lives on the card) and no LLM channel here.
    // Returning the command lets the caller log/telemetry without
    // forcing dead branches into this dispatcher.
    case 'scale':
    case 'freeform':
    case 'none':
      break;
  }
  return cmd;
}
