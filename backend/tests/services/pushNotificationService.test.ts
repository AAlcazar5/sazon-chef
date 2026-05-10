// backend/tests/services/pushNotificationService.test.ts
//
// Tier L M23 — pushNotificationService coverage. The service wraps the
// Expo Push SDK and handles per-user routing with quiet-hours / weekendsOff
// honor + invalid-token cleanup. We assert:
//   - sendToUser respects quiet hours (skips Expo entirely)
//   - sendToUser is a no-op when the user has no push tokens
//   - sendToUser only sends valid Expo tokens
//   - sendToUsers isolates failures per-user
//   - sendChunked cleans up tokens flagged DeviceNotRegistered
//   - isQuietHours: weekendsOff, overnight window, daytime window, no settings

const mockSendPushNotificationsAsync = jest.fn();
const mockChunkPushNotifications = jest.fn();
const mockIsExpoPushToken = jest.fn();

jest.mock('expo-server-sdk', () => {
  const ExpoMock = jest.fn().mockImplementation(() => ({
    sendPushNotificationsAsync: mockSendPushNotificationsAsync,
    chunkPushNotifications: mockChunkPushNotifications,
  }));
  // static method on Expo
  (ExpoMock as any).isExpoPushToken = mockIsExpoPushToken;
  return { __esModule: true, default: ExpoMock };
});

import { pushNotificationService } from '../../src/services/pushNotificationService';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

beforeEach(() => {
  jest.clearAllMocks();
  // Default: chunker returns one chunk == input array.
  mockChunkPushNotifications.mockImplementation((msgs: unknown[]) => [msgs]);
  mockIsExpoPushToken.mockReturnValue(true);
  mockSendPushNotificationsAsync.mockResolvedValue([]);
  mockPrisma.pushToken.findMany.mockResolvedValue([]);
  mockPrisma.pushToken.deleteMany.mockResolvedValue({ count: 0 });
  mockPrisma.notificationSettings.findUnique.mockResolvedValue(null);
});

describe('pushNotificationService.sendToUser', () => {
  it('skips entirely during quiet hours (no Expo call, no DB read)', async () => {
    mockPrisma.notificationSettings.findUnique.mockResolvedValueOnce({
      quietHoursStart: '00:00',
      quietHoursEnd: '23:59',
      weekendsOff: false,
    });

    await pushNotificationService.sendToUser('u1', { title: 'x', body: 'y' });

    expect(mockSendPushNotificationsAsync).not.toHaveBeenCalled();
    expect(mockPrisma.pushToken.findMany).not.toHaveBeenCalled();
  });

  it('no-ops when the user has zero push tokens', async () => {
    mockPrisma.pushToken.findMany.mockResolvedValueOnce([]);
    await pushNotificationService.sendToUser('u1', { title: 'x', body: 'y' });
    expect(mockSendPushNotificationsAsync).not.toHaveBeenCalled();
  });

  it('only sends valid Expo tokens (filters invalid via Expo.isExpoPushToken)', async () => {
    mockPrisma.pushToken.findMany.mockResolvedValueOnce([
      { token: 'ExponentPushToken[VALID]' },
      { token: 'malformed-token' },
    ]);
    mockIsExpoPushToken.mockImplementation((t: string) => t.startsWith('ExponentPushToken'));

    await pushNotificationService.sendToUser('u1', { title: 'Hi', body: 'B' });

    expect(mockSendPushNotificationsAsync).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ to: 'ExponentPushToken[VALID]', title: 'Hi', body: 'B' }),
      ]),
    );
    // Only the valid one made it through.
    const call = mockSendPushNotificationsAsync.mock.calls[0][0];
    expect(call.length).toBe(1);
  });

  it('threads the data payload (defaults to {} when not provided)', async () => {
    mockPrisma.pushToken.findMany.mockResolvedValueOnce([{ token: 'ExponentPushToken[X]' }]);

    await pushNotificationService.sendToUser('u1', { title: 't', body: 'b' });
    expect(mockSendPushNotificationsAsync.mock.calls[0][0][0].data).toEqual({});

    mockSendPushNotificationsAsync.mockClear();
    mockPrisma.pushToken.findMany.mockResolvedValueOnce([{ token: 'ExponentPushToken[X]' }]);
    await pushNotificationService.sendToUser('u1', { title: 't', body: 'b', data: { foo: 1 } });
    expect(mockSendPushNotificationsAsync.mock.calls[0][0][0].data).toEqual({ foo: 1 });
  });
});

describe('pushNotificationService.sendToUsers', () => {
  it('isolates failures per user — one failing send does not abort the rest', async () => {
    mockPrisma.pushToken.findMany
      .mockResolvedValueOnce([{ token: 'ExponentPushToken[A]' }])
      .mockResolvedValueOnce([{ token: 'ExponentPushToken[B]' }])
      .mockResolvedValueOnce([{ token: 'ExponentPushToken[C]' }]);
    mockSendPushNotificationsAsync
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce([]);

    await pushNotificationService.sendToUsers(['a', 'b', 'c'], { title: 't', body: 'b' });

    // All three users were attempted.
    expect(mockPrisma.pushToken.findMany).toHaveBeenCalledTimes(3);
    expect(mockSendPushNotificationsAsync).toHaveBeenCalledTimes(3);
  });
});

describe('pushNotificationService.sendChunked', () => {
  it('cleans up tokens marked DeviceNotRegistered', async () => {
    mockSendPushNotificationsAsync.mockResolvedValueOnce([
      { status: 'error', message: 'DeviceNotRegistered', details: { error: 'DeviceNotRegistered' } },
    ]);

    await pushNotificationService.sendChunked([
      { to: 'ExponentPushToken[DEAD]', title: 't', body: 'b' } as any,
    ]);

    expect(mockPrisma.pushToken.deleteMany).toHaveBeenCalledWith({
      where: { token: 'ExponentPushToken[DEAD]' },
    });
  });

  it('does not delete tokens for non-DeviceNotRegistered ticket errors', async () => {
    mockSendPushNotificationsAsync.mockResolvedValueOnce([
      { status: 'error', message: 'MessageRateExceeded', details: { error: 'MessageRateExceeded' } },
    ]);

    await pushNotificationService.sendChunked([
      { to: 'ExponentPushToken[OK]', title: 't', body: 'b' } as any,
    ]);

    expect(mockPrisma.pushToken.deleteMany).not.toHaveBeenCalled();
  });

  it('catches send failures so one bad chunk does not abort siblings', async () => {
    mockChunkPushNotifications.mockImplementationOnce((msgs: unknown[]) => [
      [msgs[0]],
      [msgs[1]],
    ]);
    mockSendPushNotificationsAsync
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([]);

    await pushNotificationService.sendChunked([
      { to: 't1', title: 't', body: 'b' } as any,
      { to: 't2', title: 't', body: 'b' } as any,
    ]);

    expect(mockSendPushNotificationsAsync).toHaveBeenCalledTimes(2);
  });
});

describe('pushNotificationService.isQuietHours', () => {
  it('returns false when no notification settings exist', async () => {
    mockPrisma.notificationSettings.findUnique.mockResolvedValueOnce(null);
    expect(await pushNotificationService.isQuietHours('u1')).toBe(false);
  });

  it('weekendsOff returns true on Saturday + Sunday', async () => {
    mockPrisma.notificationSettings.findUnique.mockResolvedValue({
      weekendsOff: true,
      quietHoursStart: null,
      quietHoursEnd: null,
    });

    // 2026-01-03 is Saturday; 01-04 is Sunday.
    jest.useFakeTimers().setSystemTime(new Date('2026-01-03T12:00:00'));
    expect(await pushNotificationService.isQuietHours('u1')).toBe(true);
    jest.setSystemTime(new Date('2026-01-04T12:00:00'));
    expect(await pushNotificationService.isQuietHours('u1')).toBe(true);
    // Monday: not quiet (weekendsOff alone)
    jest.setSystemTime(new Date('2026-01-05T12:00:00'));
    expect(await pushNotificationService.isQuietHours('u1')).toBe(false);
    jest.useRealTimers();
  });

  it('overnight quiet window 22:00–08:00 honored across midnight', async () => {
    mockPrisma.notificationSettings.findUnique.mockResolvedValue({
      weekendsOff: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
    });

    // 23:30 Tuesday → quiet
    jest.useFakeTimers().setSystemTime(new Date('2026-01-06T23:30:00'));
    expect(await pushNotificationService.isQuietHours('u1')).toBe(true);
    // 03:00 Wednesday → quiet (still inside the overnight window)
    jest.setSystemTime(new Date('2026-01-07T03:00:00'));
    expect(await pushNotificationService.isQuietHours('u1')).toBe(true);
    // 09:00 Wednesday → awake
    jest.setSystemTime(new Date('2026-01-07T09:00:00'));
    expect(await pushNotificationService.isQuietHours('u1')).toBe(false);
    jest.useRealTimers();
  });

  it('daytime quiet window 12:00–14:00 honored within same day', async () => {
    mockPrisma.notificationSettings.findUnique.mockResolvedValue({
      weekendsOff: false,
      quietHoursStart: '12:00',
      quietHoursEnd: '14:00',
    });

    jest.useFakeTimers().setSystemTime(new Date('2026-01-06T13:00:00'));
    expect(await pushNotificationService.isQuietHours('u1')).toBe(true);
    jest.setSystemTime(new Date('2026-01-06T14:00:00'));
    expect(await pushNotificationService.isQuietHours('u1')).toBe(false); // boundary: end is exclusive
    jest.setSystemTime(new Date('2026-01-06T11:59:00'));
    expect(await pushNotificationService.isQuietHours('u1')).toBe(false);
    jest.useRealTimers();
  });
});

describe('pushNotificationService.cleanupInvalidToken', () => {
  it('catches delete errors so cleanup never throws into a hot path', async () => {
    mockPrisma.pushToken.deleteMany.mockRejectedValueOnce(new Error('db down'));
    await expect(
      pushNotificationService.cleanupInvalidToken('ExponentPushToken[X]'),
    ).resolves.toBeUndefined();
  });
});
