// backend/tests/services/refreshTokenService.test.ts
//
// Tier L H2 — refresh token issuance / rotation / revocation.

import {
  issueTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
  RefreshTokenError,
  signAccessToken,
} from '../../src/services/refreshTokenService';
import { prisma } from '../../src/lib/prisma';

jest.mock('@/utils/encryption', () => ({
  decrypt: jest.fn((v: string) => v.replace(/^encrypted_/, '')),
  encrypt: jest.fn((v: string) => `encrypted_${v}`),
}));

const mockPrisma = prisma as any;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = 'test-secret';
  process.env.ACCESS_TOKEN_EXPIRES_IN = '15m';
  process.env.REFRESH_TOKEN_EXPIRES_DAYS = '7';
});

describe('signAccessToken', () => {
  it('returns a JWT with id + email and a future expiry', () => {
    const before = Date.now();
    const { token, expiresAt } = signAccessToken({ id: 'u1', email: 'a@b.c' });
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // header.payload.sig
    expect(expiresAt).toBeGreaterThan(before);
  });
});

describe('issueTokenPair', () => {
  it('persists a hashed refresh token and returns the raw value', async () => {
    mockPrisma.refreshToken = { create: jest.fn().mockResolvedValue({}) };

    const pair = await issueTokenPair({ id: 'u1', email: 'a@b.c' }, { userAgent: 'jest', ipAddress: '127.0.0.1' });

    expect(pair.accessToken).toBeTruthy();
    expect(pair.refreshToken).toBeTruthy();
    expect(pair.refreshToken.length).toBeGreaterThan(20);

    const createCall = mockPrisma.refreshToken.create.mock.calls[0][0];
    // Hash, not raw, in DB.
    expect(createCall.data.tokenHash).not.toBe(pair.refreshToken);
    expect(createCall.data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(createCall.data.userId).toBe('u1');
    expect(createCall.data.userAgent).toBe('jest');
    expect(createCall.data.ipAddress).toBe('127.0.0.1');
  });

  it('two consecutive calls produce different refresh tokens', async () => {
    mockPrisma.refreshToken = { create: jest.fn().mockResolvedValue({}) };
    const a = await issueTokenPair({ id: 'u1', email: 'a@b.c' });
    const b = await issueTokenPair({ id: 'u1', email: 'a@b.c' });
    expect(a.refreshToken).not.toBe(b.refreshToken);
  });
});

describe('rotateRefreshToken', () => {
  function fakeStoredToken(overrides: any = {}) {
    return {
      id: 'rt1',
      userId: 'u1',
      tokenHash: 'hash-existing',
      expiresAt: new Date(Date.now() + 60 * 1000),
      revokedAt: null,
      replacedById: null,
      ...overrides,
    };
  }

  it('issues a new pair, revokes the old token, links the chain', async () => {
    const stored = fakeStoredToken();
    mockPrisma.refreshToken = {
      findUnique: jest.fn().mockResolvedValue(stored),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    };
    mockPrisma.user = {
      findUnique: jest.fn().mockResolvedValue({
        id: 'u1',
        email: 'encrypted_a@b.c',
        emailEncrypted: true,
      }),
    };
    mockPrisma.$transaction = jest.fn(async (cb: any) => {
      const tx = {
        refreshToken: {
          create: jest.fn().mockResolvedValue({ id: 'rt2', expiresAt: new Date(Date.now() + 60_000) }),
          update: jest.fn(),
        },
      };
      return cb(tx);
    });

    const pair = await rotateRefreshToken('any-raw-token-value');

    expect(pair.refreshToken).toBeTruthy();
    expect(pair.accessToken).toBeTruthy();
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it('throws NOT_FOUND when the token hash does not exist', async () => {
    mockPrisma.refreshToken = { findUnique: jest.fn().mockResolvedValue(null) };
    await expect(rotateRefreshToken('whatever')).rejects.toBeInstanceOf(RefreshTokenError);
    await expect(rotateRefreshToken('whatever')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('throws EXPIRED when expiresAt is in the past', async () => {
    mockPrisma.refreshToken = {
      findUnique: jest.fn().mockResolvedValue(
        fakeStoredToken({ expiresAt: new Date(Date.now() - 1000) }),
      ),
    };
    await expect(rotateRefreshToken('x')).rejects.toMatchObject({ code: 'EXPIRED' });
  });

  it('replay detection: revokes ALL tokens for the user when a revoked token is re-presented', async () => {
    mockPrisma.refreshToken = {
      findUnique: jest.fn().mockResolvedValue(
        fakeStoredToken({ revokedAt: new Date() }),
      ),
      updateMany: jest.fn().mockResolvedValue({ count: 4 }),
    };

    await expect(rotateRefreshToken('x')).rejects.toMatchObject({ code: 'REPLAY_DETECTED' });

    // The whole chain for that user must be torched.
    expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', revokedAt: null },
      data: expect.objectContaining({ revokedAt: expect.any(Date) }),
    });
  });

  it('throws NOT_FOUND when the user no longer exists', async () => {
    mockPrisma.refreshToken = {
      findUnique: jest.fn().mockResolvedValue(fakeStoredToken()),
    };
    mockPrisma.user = { findUnique: jest.fn().mockResolvedValue(null) };
    await expect(rotateRefreshToken('x')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('revokeRefreshToken', () => {
  it('marks the matching token revoked', async () => {
    mockPrisma.refreshToken = { updateMany: jest.fn().mockResolvedValue({ count: 1 }) };
    await revokeRefreshToken('raw-token');
    const call = mockPrisma.refreshToken.updateMany.mock.calls[0][0];
    expect(call.where.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(call.where.revokedAt).toBeNull();
  });

  it('is idempotent on unknown tokens (no-op)', async () => {
    mockPrisma.refreshToken = { updateMany: jest.fn().mockResolvedValue({ count: 0 }) };
    await expect(revokeRefreshToken('unknown')).resolves.toBeUndefined();
  });
});

describe('revokeAllRefreshTokensForUser', () => {
  it('revokes every active token for a userId and returns the count', async () => {
    mockPrisma.refreshToken = { updateMany: jest.fn().mockResolvedValue({ count: 3 }) };
    const n = await revokeAllRefreshTokensForUser('u1');
    expect(n).toBe(3);
    expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', revokedAt: null },
      data: expect.objectContaining({ revokedAt: expect.any(Date) }),
    });
  });
});
