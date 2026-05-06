// ROADMAP 4.0 T0.1 — Tonight Mode feature flag service.
//
// Single source of truth for the SAZON_TONIGHT_MODE env gate. Reads
// process.env at call time (not module load) so tests can flip the flag
// per-test. When the env flag is off, user-level toggles cannot be persisted.

import { prisma } from '../lib/prisma';

export const isTonightModeEnabled = (): boolean => {
  return process.env.SAZON_TONIGHT_MODE === '1';
};

export interface SetTonightModeResult {
  ok: boolean;
  reason?: 'flag_off';
}

export const setUserTonightModeEnabled = async (
  userId: string,
  enabled: boolean
): Promise<SetTonightModeResult> => {
  if (!isTonightModeEnabled()) {
    return { ok: false, reason: 'flag_off' };
  }
  await prisma.user.update({
    where: { id: userId },
    data: { tonightModeEnabled: enabled },
  });
  return { ok: true };
};

export const setUserTonightModePromptedAt = async (
  userId: string,
  at: Date
): Promise<void> => {
  await prisma.user.update({
    where: { id: userId },
    data: { tonightModePromptedAt: at },
  });
};
