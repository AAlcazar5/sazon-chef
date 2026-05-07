// ROADMAP 4.0 N8.2 — userPrivacyService test.

import { prisma } from '../../src/lib/prisma';
import {
  getPrivacySettings,
  updatePrivacySettings,
  canShareCrossUserData,
  canSurfaceFriends,
} from '../../src/services/userPrivacyService';

const findUnique = jest.fn();
const upsert = jest.fn();

(prisma as any).userPreferences = {
  ...((prisma as any).userPreferences ?? {}),
  findUnique,
  upsert,
};

beforeEach(() => {
  findUnique.mockReset();
  upsert.mockReset();
  upsert.mockResolvedValue({});
});

describe('N8.2 — getPrivacySettings', () => {
  it('returns defaults for empty userId (no DB hit)', async () => {
    const settings = await getPrivacySettings('');
    expect(settings.shareOptIn).toBe(true);
    expect(settings.socialOptIn).toBe(false);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('returns defaults when prefs row is missing', async () => {
    findUnique.mockResolvedValue(null);
    const settings = await getPrivacySettings('u1');
    expect(settings.shareOptIn).toBe(true);
    expect(settings.socialOptIn).toBe(false);
  });

  it('reads stored values when prefs row exists', async () => {
    findUnique.mockResolvedValue({
      privacyShareOptIn: false,
      socialOptIn: true,
    });
    const settings = await getPrivacySettings('u1');
    expect(settings.shareOptIn).toBe(false);
    expect(settings.socialOptIn).toBe(true);
  });

  it('falls back to defaults for null fields (legacy rows pre-migration)', async () => {
    findUnique.mockResolvedValue({
      privacyShareOptIn: null,
      socialOptIn: null,
    });
    const settings = await getPrivacySettings('u1');
    expect(settings.shareOptIn).toBe(true);
    expect(settings.socialOptIn).toBe(false);
  });
});

describe('N8.2 — updatePrivacySettings', () => {
  it('rejects empty userId', async () => {
    await expect(
      updatePrivacySettings({ userId: '' }),
    ).rejects.toThrow(/userId/);
  });

  it('upserts privacyShareOptIn when provided', async () => {
    findUnique.mockResolvedValue({ privacyShareOptIn: false, socialOptIn: false });
    await updatePrivacySettings({ userId: 'u1', shareOptIn: false });
    const args = upsert.mock.calls[0][0];
    expect(args.where.userId).toBe('u1');
    expect(args.update.privacyShareOptIn).toBe(false);
    expect(args.update.socialOptIn).toBeUndefined();
  });

  it('upserts socialOptIn independently', async () => {
    findUnique.mockResolvedValue({ privacyShareOptIn: true, socialOptIn: true });
    await updatePrivacySettings({ userId: 'u1', socialOptIn: true });
    const args = upsert.mock.calls[0][0];
    expect(args.update.socialOptIn).toBe(true);
    expect(args.update.privacyShareOptIn).toBeUndefined();
  });

  it('upserts both flags together when provided', async () => {
    findUnique.mockResolvedValue({ privacyShareOptIn: false, socialOptIn: true });
    await updatePrivacySettings({
      userId: 'u1',
      shareOptIn: false,
      socialOptIn: true,
    });
    const args = upsert.mock.calls[0][0];
    expect(args.update.privacyShareOptIn).toBe(false);
    expect(args.update.socialOptIn).toBe(true);
  });

  it('returns the post-update settings', async () => {
    findUnique.mockResolvedValue({
      privacyShareOptIn: false,
      socialOptIn: true,
    });
    const result = await updatePrivacySettings({
      userId: 'u1',
      shareOptIn: false,
      socialOptIn: true,
    });
    expect(result).toEqual({ shareOptIn: false, socialOptIn: true });
  });
});

describe('N8.2 — convenience guards', () => {
  it('canShareCrossUserData returns true by default', async () => {
    findUnique.mockResolvedValue(null);
    expect(await canShareCrossUserData('u1')).toBe(true);
  });

  it('canShareCrossUserData returns false when opted out', async () => {
    findUnique.mockResolvedValue({
      privacyShareOptIn: false,
      socialOptIn: false,
    });
    expect(await canShareCrossUserData('u1')).toBe(false);
  });

  it('canSurfaceFriends returns false by default (opt-in social)', async () => {
    findUnique.mockResolvedValue(null);
    expect(await canSurfaceFriends('u1')).toBe(false);
  });

  it('canSurfaceFriends returns true when opted in', async () => {
    findUnique.mockResolvedValue({
      privacyShareOptIn: true,
      socialOptIn: true,
    });
    expect(await canSurfaceFriends('u1')).toBe(true);
  });
});
