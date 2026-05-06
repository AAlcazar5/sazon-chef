// ROADMAP 4.0 T0.1 — Tonight Mode feature flag service test.
//
// Red-first: ensure the env-flag gate behaves correctly:
//   - env-off → toggle save is blocked (returns false)
//   - env-on  → toggle persists
//   - the helper reads `process.env.SAZON_TONIGHT_MODE === '1'` at call time

import {
  isTonightModeEnabled,
  setUserTonightModeEnabled,
} from '../../src/services/featureFlagService';
import { prisma } from '../../src/lib/prisma';

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    user: {
      update: jest.fn(),
    },
  },
}));

describe('featureFlagService — tonight mode', () => {
  const originalFlag = process.env.SAZON_TONIGHT_MODE;

  afterEach(() => {
    process.env.SAZON_TONIGHT_MODE = originalFlag;
    jest.clearAllMocks();
  });

  describe('isTonightModeEnabled()', () => {
    it('returns true when SAZON_TONIGHT_MODE === "1"', () => {
      process.env.SAZON_TONIGHT_MODE = '1';
      expect(isTonightModeEnabled()).toBe(true);
    });

    it('returns false when env var is unset', () => {
      delete process.env.SAZON_TONIGHT_MODE;
      expect(isTonightModeEnabled()).toBe(false);
    });

    it('returns false when env var is any value other than "1"', () => {
      process.env.SAZON_TONIGHT_MODE = '0';
      expect(isTonightModeEnabled()).toBe(false);
      process.env.SAZON_TONIGHT_MODE = 'true';
      expect(isTonightModeEnabled()).toBe(false);
    });
  });

  describe('setUserTonightModeEnabled()', () => {
    it('blocks the write and returns { ok: false } when env flag is off', async () => {
      delete process.env.SAZON_TONIGHT_MODE;
      const result = await setUserTonightModeEnabled('user-1', true);
      expect(result.ok).toBe(false);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('persists the pref and returns { ok: true } when env flag is on', async () => {
      process.env.SAZON_TONIGHT_MODE = '1';
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: 'user-1',
        tonightModeEnabled: true,
      });
      const result = await setUserTonightModeEnabled('user-1', true);
      expect(result.ok).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { tonightModeEnabled: true },
      });
    });

    it('persists `false` when disabling', async () => {
      process.env.SAZON_TONIGHT_MODE = '1';
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: 'user-1',
        tonightModeEnabled: false,
      });
      const result = await setUserTonightModeEnabled('user-1', false);
      expect(result.ok).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { tonightModeEnabled: false },
      });
    });
  });
});
