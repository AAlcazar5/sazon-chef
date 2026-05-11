// backend/src/services/refreshTokenService.ts
//
// Tier L H2 — refresh-token issuance, rotation, and revocation.
//
// Design:
// - Access token: short-lived JWT (15 min default; ACCESS_TOKEN_EXPIRES_IN env).
// - Refresh token: opaque random 256-bit string (base64url-encoded). Only the
//   SHA-256 hash is stored server-side; the plaintext goes to the client and
//   is never persisted. A DB leak alone cannot mint sessions.
// - Single-use rotation: every /auth/refresh consumes a token and issues a
//   new one. The old token's `replacedById` points to the new row, forming
//   a chain that detects token-replay (if the same token is presented twice,
//   we revoke the entire chain — that's a stolen-cookie signal).
// - Expiry: 7 days by default (REFRESH_TOKEN_EXPIRES_DAYS env).

import { randomBytes, createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';
import { JWT_SECRET } from '@/utils/jwtConfig';

const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7);

export interface IssuedTokenPair {
  accessToken: string;
  refreshToken: string;
  // ms-precision expiry timestamps so the mobile client can preempt 401s.
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
}

export interface AccessTokenPayload {
  id: string;
  email: string;
}

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function generateRawRefreshToken(): string {
  // 32 bytes = 256 bits. base64url so the token survives URL/header transit.
  return randomBytes(32).toString('base64url');
}

export function signAccessToken(payload: AccessTokenPayload): { token: string; expiresAt: number } {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN } as jwt.SignOptions);
  // jsonwebtoken doesn't return the parsed exp directly; decode for the timestamp.
  // Guarded so older jwt mocks without `decode` (legacy tests) don't throw.
  let decoded: { exp?: number } | null = null;
  if (typeof (jwt as { decode?: unknown }).decode === 'function') {
    decoded = jwt.decode(token) as { exp?: number } | null;
  }
  const expiresAt = decoded?.exp ? decoded.exp * 1000 : Date.now() + 15 * 60 * 1000;
  return { token, expiresAt };
}

/**
 * Issue a fresh (access, refresh) pair and persist the refresh-token hash.
 * Used by /auth/login, /auth/register, /auth/social-login.
 */
export async function issueTokenPair(
  user: AccessTokenPayload,
  meta?: { userAgent?: string | null; ipAddress?: string | null },
): Promise<IssuedTokenPair> {
  const { token: accessToken, expiresAt: accessExpiresAt } = signAccessToken(user);

  const rawRefresh = generateRawRefreshToken();
  const tokenHash = hashToken(rawRefresh);
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: refreshExpiresAt,
      userAgent: meta?.userAgent ?? null,
      ipAddress: meta?.ipAddress ?? null,
    },
  });

  return {
    accessToken,
    refreshToken: rawRefresh,
    accessTokenExpiresAt: accessExpiresAt,
    refreshTokenExpiresAt: refreshExpiresAt.getTime(),
  };
}

export class RefreshTokenError extends Error {
  constructor(public readonly code: 'NOT_FOUND' | 'EXPIRED' | 'REVOKED' | 'REPLAY_DETECTED', message: string) {
    super(message);
    this.name = 'RefreshTokenError';
  }
}

/**
 * Rotate a refresh token: validate the inbound token, mark it revoked, and
 * issue a fresh pair. If the inbound token is already revoked (i.e. it was
 * replaced by another), this is a replay signal — we revoke the entire
 * chain rooted at the original token and refuse to mint new ones.
 */
export async function rotateRefreshToken(
  rawToken: string,
  meta?: { userAgent?: string | null; ipAddress?: string | null },
): Promise<IssuedTokenPair> {
  const tokenHash = hashToken(rawToken);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!existing) {
    throw new RefreshTokenError('NOT_FOUND', 'Refresh token not recognized');
  }

  if (existing.expiresAt < new Date()) {
    throw new RefreshTokenError('EXPIRED', 'Refresh token expired');
  }

  if (existing.revokedAt) {
    // Replay: this token was already used. Treat as compromise signal —
    // revoke every refresh token for this user so no chain remains valid.
    await prisma.refreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    logger.warn(
      { userId: existing.userId, tokenId: existing.id },
      'auth.refreshToken.replayDetected',
    );
    throw new RefreshTokenError('REPLAY_DETECTED', 'Refresh token reuse detected — all sessions revoked');
  }

  // Look up the user's email so we can re-sign an access token. The login
  // happy-path stores email on the JWT so downstream middleware doesn't
  // need a DB hit per request.
  const user = await prisma.user.findUnique({
    where: { id: existing.userId },
    select: { id: true, email: true, emailEncrypted: true },
  });

  if (!user) {
    throw new RefreshTokenError('NOT_FOUND', 'User no longer exists');
  }

  const { decrypt } = await import('@/utils/encryption');
  const email = user.emailEncrypted ? decrypt(user.email) : user.email;

  // Mint the new pair, link the chain, revoke the old token — all in one txn
  // so a partial failure can't leave dangling rows.
  const { token: accessToken, expiresAt: accessExpiresAt } = signAccessToken({ id: user.id, email });
  const rawRefresh = generateRawRefreshToken();
  const newHash = hashToken(rawRefresh);
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

  const created = await prisma.$transaction(async (tx) => {
    const newToken = await tx.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newHash,
        expiresAt: refreshExpiresAt,
        userAgent: meta?.userAgent ?? null,
        ipAddress: meta?.ipAddress ?? null,
      },
    });
    await tx.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedById: newToken.id },
    });
    return newToken;
  });

  return {
    accessToken,
    refreshToken: rawRefresh,
    accessTokenExpiresAt: accessExpiresAt,
    refreshTokenExpiresAt: created.expiresAt.getTime(),
  };
}

/**
 * Revoke a single refresh token (logout from this device).
 * Idempotent — silently no-ops on unknown / already-revoked tokens.
 */
export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Revoke every active refresh token for a user (logout-all / password reset
 * / account compromise). Returns the count of tokens revoked.
 */
export async function revokeAllRefreshTokensForUser(userId: string): Promise<number> {
  const r = await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return r.count;
}
