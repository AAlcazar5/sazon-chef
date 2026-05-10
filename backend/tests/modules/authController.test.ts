// backend/tests/modules/authController.test.ts
// Tests for authentication endpoints

import { Request, Response } from 'express';
import { authController } from '../../src/modules/auth/authController';
import { prisma } from '../../src/lib/prisma';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

// Mock encryption utility
jest.mock('../../src/utils/encryption', () => ({
  encrypt: jest.fn((text: string) => `encrypted_${text}`),
  decrypt: jest.fn((text: string) => text.replace(/^encrypted_/, '')),
  isEncrypted: jest.fn((text: string) => text.startsWith('encrypted_')),
}));

// Type for authenticated user
type AuthenticatedUser = {
  id: string;
  email: string;
};

// Mock Prisma — Tier L H2 added refreshToken model used by issueTokenPair.
jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    $transaction: jest.fn(async (cb: any) => cb({})),
  },
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock jwt — `decode` is needed by signAccessToken to read the exp claim.
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  decode: jest.fn(() => ({ exp: Math.floor(Date.now() / 1000) + 900 })),
}));

describe('Auth Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      user: undefined,
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      mockReq.body = userData;

      // Mock the user lookup - no existing user
      (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce(null); // providerEmail check
      (prisma.user.findMany as jest.Mock).mockResolvedValueOnce([]); // encrypted emails check
      (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce(null); // unencrypted check
      
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      (jwt.sign as jest.Mock).mockReturnValue('mockJwtToken');

      const createdUser = {
        id: 'user-123',
        email: `encrypted_${userData.email}`,
        name: `encrypted_${userData.name}`,
        emailEncrypted: true,
        nameEncrypted: true,
        createdAt: new Date(),
      };

      (prisma.user.create as jest.Mock).mockResolvedValue(createdUser);

      await authController.register(mockReq as Request, mockRes as Response);

      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 12);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: expect.stringContaining('encrypted_'),
          name: expect.stringContaining('encrypted_'),
          password: 'hashedPassword123',
          emailEncrypted: true,
          nameEncrypted: true,
        },
        select: expect.any(Object),
      });

      expect(jwt.sign).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'User registered successfully',
          user: expect.objectContaining({
            id: 'user-123',
            email: userData.email, // Decrypted in response
            name: userData.name, // Decrypted in response
          }),
          token: 'mockJwtToken',
        })
      );
    });

    it('should reject registration with missing fields', async () => {
      mockReq.body = {
        email: 'test@example.com',
        // Missing password and name
      };

      await authController.register(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Email, password, and name are required',
        })
      );
    });

    it('should reject registration with invalid email', async () => {
      mockReq.body = {
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User',
      };

      await authController.register(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Please enter a valid email address',
        })
      );
    });

    it('should reject registration with short password', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'short',
        name: 'Test User',
      };

      await authController.register(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Password must be at least 8 characters long',
        })
      );
    });

    it('should reject registration if user already exists', async () => {
      mockReq.body = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
      };

      // Mock finding existing user by providerEmail
      (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'existing-user',
        email: `encrypted_${mockReq.body.email}`,
      });

      await authController.register(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'An account with this email already exists',
        })
      );

      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockReq.body = userData;

      const user = {
        id: 'user-123',
        email: `encrypted_${userData.email}`,
        name: `encrypted_Test User`,
        password: 'hashedPassword123',
        emailEncrypted: true,
        nameEncrypted: true,
        providerEmail: null,
      };

      // Mock the login user lookup - user found in encrypted emails
      (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce(null); // providerEmail check
      (prisma.user.findMany as jest.Mock).mockResolvedValueOnce([user]); // encrypted emails - will be found

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('mockJwtToken');

      await authController.login(mockReq as Request, mockRes as Response);

      expect(bcrypt.compare).toHaveBeenCalledWith(
        userData.password,
        user.password
      );

      expect(jwt.sign).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Login successful',
          user: expect.objectContaining({
            id: user.id,
            email: userData.email, // Decrypted in response
            name: 'Test User', // Decrypted in response
          }),
          token: 'mockJwtToken',
        })
      );

      // Verify password is not in response
      const responseCall = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.user.password).toBeUndefined();
    });

    it('should reject login with missing fields', async () => {
      mockReq.body = {
        email: 'test@example.com',
        // Missing password
      };

      await authController.login(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Email and password are required',
        })
      );
    });

    it('should reject login with invalid email', async () => {
      mockReq.body = {
        email: 'invalid-email',
        password: 'password123',
      };

      // Mock the login user lookup - user not found
      (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce(null); // providerEmail check
      (prisma.user.findMany as jest.Mock).mockResolvedValueOnce([]); // encrypted emails check
      (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce(null); // unencrypted check

      await authController.login(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Email or password is incorrect',
        })
      );
    });

    it('should reject login with incorrect password', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const user = {
        id: 'user-123',
        email: `encrypted_${mockReq.body.email}`,
        name: `encrypted_Test User`,
        password: 'hashedPassword123',
        emailEncrypted: true,
        nameEncrypted: true,
        providerEmail: null,
      };

      // Mock the login user lookup - user found in encrypted emails
      (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce(null); // providerEmail check
      (prisma.user.findMany as jest.Mock).mockResolvedValueOnce([user]); // encrypted emails - will be found

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await authController.login(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Email or password is incorrect',
        })
      );
    });

    it('should reject login for social login users without password', async () => {
      mockReq.body = {
        email: 'social@example.com',
        password: 'password123',
      };

      const user = {
        id: 'user-123',
        email: `encrypted_${mockReq.body.email}`,
        name: `encrypted_Social User`,
        password: null, // Social login user
        emailEncrypted: true,
        nameEncrypted: true,
        providerEmail: null,
      };

      // Mock the login user lookup - user found in encrypted emails
      (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce(null); // providerEmail check
      (prisma.user.findMany as jest.Mock).mockResolvedValueOnce([user]); // encrypted emails - will be found

      await authController.login(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('social login'),
        })
      );
    });

    // Tier L H2 — refresh-token issuance is wired into login; assert that
    // the response now exposes accessToken + refreshToken alongside the
    // legacy `token` field so the mobile client can transition gradually.
    it('login response includes accessToken + refreshToken (H2)', async () => {
      mockReq.body = { email: 'test@example.com', password: 'password123' };
      const user = {
        id: 'user-h2',
        email: 'encrypted_test@example.com',
        name: 'encrypted_T',
        password: 'hashed',
        emailEncrypted: true,
        nameEncrypted: true,
        providerEmail: null,
        emailVerified: true,
      };
      (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce(null);
      (prisma.user.findMany as jest.Mock).mockResolvedValueOnce([user]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('mockAccessToken');

      await authController.login(mockReq as Request, mockRes as Response);

      const responseBody = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(responseBody.accessToken).toBe('mockAccessToken');
      expect(typeof responseBody.refreshToken).toBe('string');
      expect(responseBody.refreshToken.length).toBeGreaterThan(20);
      expect(typeof responseBody.refreshTokenExpiresAt).toBe('number');
      // Legacy field still populated for backwards compat.
      expect(responseBody.token).toBe('mockAccessToken');
    });

    // Tier L H3 — email-verification gate. The flag is read at request time
    // so the env var can be toggled per test.
    describe('email verification gate (H3)', () => {
      const originalFlag = process.env.REQUIRE_EMAIL_VERIFICATION;
      afterAll(() => {
        if (originalFlag === undefined) delete process.env.REQUIRE_EMAIL_VERIFICATION;
        else process.env.REQUIRE_EMAIL_VERIFICATION = originalFlag;
      });

      function userFixture(overrides: Partial<{ emailVerified: boolean }> = {}) {
        return {
          id: 'user-h3',
          email: 'encrypted_test@example.com',
          name: 'encrypted_Test User',
          password: 'hashedPassword123',
          emailEncrypted: true,
          nameEncrypted: true,
          providerEmail: null,
          emailVerified: false,
          ...overrides,
        };
      }

      function mockLookup(user: ReturnType<typeof userFixture>) {
        (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce(null);
        (prisma.user.findMany as jest.Mock).mockResolvedValueOnce([user]);
      }

      it('blocks unverified user with 403 EMAIL_NOT_VERIFIED when flag is on', async () => {
        process.env.REQUIRE_EMAIL_VERIFICATION = 'true';
        mockReq.body = { email: 'test@example.com', password: 'password123' };
        mockLookup(userFixture({ emailVerified: false }));
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        await authController.login(mockReq as Request, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ code: 'EMAIL_NOT_VERIFIED' }),
        );
      });

      it('lets verified user through when flag is on', async () => {
        process.env.REQUIRE_EMAIL_VERIFICATION = 'true';
        mockReq.body = { email: 'test@example.com', password: 'password123' };
        mockLookup(userFixture({ emailVerified: true }));
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (jwt.sign as jest.Mock).mockReturnValue('mockJwtToken');

        await authController.login(mockReq as Request, mockRes as Response);

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ success: true, token: 'mockJwtToken' }),
        );
      });

      it('lets unverified user through when flag is off (legacy posture)', async () => {
        delete process.env.REQUIRE_EMAIL_VERIFICATION;
        mockReq.body = { email: 'test@example.com', password: 'password123' };
        mockLookup(userFixture({ emailVerified: false }));
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (jwt.sign as jest.Mock).mockReturnValue('mockJwtToken');

        await authController.login(mockReq as Request, mockRes as Response);

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ success: true, token: 'mockJwtToken' }),
        );
      });
    });
  });

  describe('getProfile', () => {
    it('should get authenticated user profile', async () => {
      (mockReq as any).user = {
        id: 'user-123',
        email: 'test@example.com',
      } as AuthenticatedUser;

      const user = {
        id: 'user-123',
        email: 'encrypted_test@example.com',
        name: 'encrypted_Test User',
        emailEncrypted: true,
        nameEncrypted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);

      await authController.getProfile(mockReq as Request, mockRes as Response);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: {
          id: true,
          email: true,
          name: true,
          emailEncrypted: true,
          nameEncrypted: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          user: expect.objectContaining({
            id: 'user-123',
            email: 'test@example.com', // Decrypted
            name: 'Test User', // Decrypted
          }),
        })
      );
    });

    it('should reject getProfile without authentication', async () => {
      (mockReq as any).user = undefined;

      await authController.getProfile(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized',
        })
      );
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      (mockReq as any).user = {
        id: 'user-123',
        email: 'test@example.com',
      } as AuthenticatedUser;

      mockReq.body = {
        name: 'Updated Name',
      };

      const updatedUser = {
        id: 'user-123',
        email: 'encrypted_test@example.com',
        name: 'encrypted_Updated Name',
        emailEncrypted: true,
        nameEncrypted: true,
        updatedAt: new Date(),
      };

      (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

      await authController.updateProfile(mockReq as Request, mockRes as Response);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          name: expect.stringContaining('encrypted_'),
          nameEncrypted: true,
        },
        select: expect.any(Object),
      });

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Profile updated successfully',
          user: expect.objectContaining({
            id: 'user-123',
            email: 'test@example.com', // Decrypted
            name: 'Updated Name', // Decrypted
          }),
        })
      );
    });

    it('should reject updateProfile without authentication', async () => {
      (mockReq as any).user = undefined;

      await authController.updateProfile(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should reject updateProfile with duplicate email', async () => {
      (mockReq as any).user = {
        id: 'user-123',
        email: 'test@example.com',
      } as AuthenticatedUser;

      mockReq.body = {
        email: 'existing@example.com',
      };

      // Mock the email check - email exists for another user
      (prisma.user.findMany as jest.Mock).mockResolvedValue([{
        id: 'other-user',
        email: 'encrypted_existing@example.com',
        emailEncrypted: true,
        providerEmail: null,
      }]);

      await authController.updateProfile(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Email already in use',
        })
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      (mockReq as any).user = {
        id: 'user-123',
        email: 'test@example.com',
      } as AuthenticatedUser;

      mockReq.body = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
      };

      const user = {
        id: 'user-123',
        password: 'hashedOldPassword',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedNewPassword');

      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: 'user-123',
      });

      await authController.changePassword(mockReq as Request, mockRes as Response);

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'oldPassword123',
        'hashedOldPassword'
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 12);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { password: 'hashedNewPassword' },
      });

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Password changed successfully',
        })
      );
    });

    it('should reject changePassword with incorrect current password', async () => {
      (mockReq as any).user = {
        id: 'user-123',
        email: 'test@example.com',
      } as AuthenticatedUser;

      mockReq.body = {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword123',
      };

      const user = {
        id: 'user-123',
        password: 'hashedOldPassword',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await authController.changePassword(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid password',
        })
      );

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should reject changePassword with short new password', async () => {
      (mockReq as any).user = {
        id: 'user-123',
        email: 'test@example.com',
      } as AuthenticatedUser;

      mockReq.body = {
        currentPassword: 'oldPassword123',
        newPassword: 'short',
      };

      await authController.changePassword(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/password.*8|short/i),
        })
      );
    });
  });

  // Tier L H2 — refresh + logout endpoints.
  describe('refreshSession', () => {
    it('rejects missing refreshToken with 400', async () => {
      mockReq.body = {};
      await authController.refreshSession(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('returns 401 with code NOT_FOUND when refresh token is unknown', async () => {
      mockReq.body = { refreshToken: 'mystery-token' };
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await authController.refreshSession(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'NOT_FOUND' }),
      );
    });

    it('issues a fresh pair on a valid refresh token', async () => {
      mockReq.body = { refreshToken: 'valid-raw-token' };
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'rt1',
        userId: 'u1',
        tokenHash: 'h',
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
        replacedById: null,
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'u1',
        email: 'encrypted_a@b.c',
        emailEncrypted: true,
      });
      (jwt.sign as jest.Mock).mockReturnValue('newAccessToken');
      (prisma.$transaction as jest.Mock).mockImplementationOnce(async (cb: any) =>
        cb({
          refreshToken: {
            create: jest.fn().mockResolvedValue({ id: 'rt2', expiresAt: new Date(Date.now() + 60_000) }),
            update: jest.fn(),
          },
        }),
      );

      await authController.refreshSession(mockReq as Request, mockRes as Response);

      const body = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(body.accessToken).toBe('newAccessToken');
      expect(typeof body.refreshToken).toBe('string');
      expect(body.refreshToken).not.toBe('valid-raw-token'); // rotated
    });

    it('returns 401 REPLAY_DETECTED when a revoked refresh token is presented', async () => {
      mockReq.body = { refreshToken: 'replay-token' };
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'rt1',
        userId: 'u1',
        tokenHash: 'h',
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: new Date(),
        replacedById: 'rt0',
      });
      (prisma.refreshToken.updateMany as jest.Mock).mockResolvedValueOnce({ count: 3 });

      await authController.refreshSession(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'REPLAY_DETECTED' }),
      );
    });
  });

  describe('logout', () => {
    it('revokes a single refresh token and returns 200', async () => {
      mockReq.body = { refreshToken: 'some-token' };
      (prisma.refreshToken.updateMany as jest.Mock).mockResolvedValueOnce({ count: 1 });

      await authController.logout(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    });

    it('is idempotent on missing/empty refresh tokens', async () => {
      mockReq.body = {};
      await authController.logout(mockReq as Request, mockRes as Response);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('with everywhere:true revokes every active token for the user', async () => {
      mockReq.body = { everywhere: true };
      (mockReq as any).user = { id: 'user-1' } as AuthenticatedUser;
      (prisma.refreshToken.updateMany as jest.Mock).mockResolvedValueOnce({ count: 4 });

      await authController.logout(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, revoked: 4 }),
      );
    });

    it('with everywhere:true and no req.user returns 401', async () => {
      mockReq.body = { everywhere: true };
      mockReq.user = undefined;
      await authController.logout(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });
});
