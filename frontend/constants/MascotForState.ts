// frontend/constants/MascotForState.ts
//
// ROADMAP 4.0 DS4.7 — every UI state maps to a designed Sazon mascot
// expression. Centralized so engineers don't pick "sad" or "angry"
// expressions that violate the lifestyle voice (no punitive UI).
//
// Source: REDESIGN_PHILOSOPHY.md mascot pairing rules + design.md §10.

export type SazonExpression =
  | 'thinking'
  | 'chef-kiss'
  | 'curious'
  | 'sleepy'
  | 'happy'
  | 'idle'
  | 'celebrating';

export type SazonState =
  | 'loading'
  | 'success'
  | 'cooking-complete'
  | 'search-empty'
  | 'no-notifications'
  | 'no-results'
  | 'idle'
  | 'error'
  | 'streak'
  | 'milestone'
  | 'first-launch';

export const MascotForState: Readonly<Record<SazonState, SazonExpression>> = {
  loading: 'thinking',
  success: 'chef-kiss',
  'cooking-complete': 'chef-kiss',
  'search-empty': 'curious',
  'no-notifications': 'sleepy',
  'no-results': 'curious',
  idle: 'idle',
  error: 'thinking', // never sad — voice rule
  streak: 'celebrating',
  milestone: 'celebrating',
  'first-launch': 'happy',
};

/** Banned expressions — these are intentionally absent from the mapping. */
export const BANNED_EXPRESSIONS = ['sad', 'angry', 'frustrated', 'crying'] as const;

export function expressionFor(state: SazonState): SazonExpression {
  return MascotForState[state];
}
