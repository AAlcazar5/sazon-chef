// backend/tests/integration/auth-integration.test.ts
// Auth controller unit tests (covers registration, login, profile, password change)

import { Request, Response } from 'express';
import { prisma } from '../../src/lib/prisma';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn(),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ id: 'test-user-id', email: 'test@example.com' }),
}));

// Mock email service (fire-and-forget welcome email)
jest.mock('../../src/services/emailService', () => ({
  emailService: {
    sendWelcome: jest.fn().mockResolvedValue(undefined),
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock encryption
jest.mock('../../src/utils/encryption', () => ({
  encrypt: (val: string) => `encrypted_${val}`,
  decrypt: (val: string) => val.startsWith('encrypted_') ? val.replace('encrypted_', '') : val,
}));

const bcrypt = require('bcrypt');

// Import auth controller after mocks
const { authController } = require('../../src/modules/auth/authController');

describe('Authentication Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockReq = {
      body: {},
      params: {},
      headers: {},
      user: { id: 'test-user-id', email: 'test@example.com' },
    };
    mockRes = {
      json: mockJson,
      status: mockStatus,
    };
  });

  describe('Registration', () => {
    it('should register a new user', async () => {
      mockReq.body = {
        email: 'new@example.com',
        password: 'testPassword123',
        name: 'New User',
      };

      // No existing user found via any lookup method
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new-user-id',
        email: 'encrypted_new@example.com',
        name: 'encrypted_New User',
        emailEncrypted: true,
        nameEncrypted: true,
        createdAt: new Date(),
      });

      await authController.register(mockReq as Request, mockRes as Response);

      expect(prisma.user.create).toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          token: 'mock-jwt-token',
        })
      );
    });

    it('should reject duplicate email (existing user)', async () => {
      mockReq.body = {
        email: 'existing@example.com',
        password: 'testPassword123',
        name: 'Test User',
      };

      // First findFirst (providerEmail check) returns existing user
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-id',
        email: 'existing@example.com',
      });

      await authController.register(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(409);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('already exists') })
      );
    });

    it('should reject registration with short password', async () => {
      mockReq.body = {
        email: 'new@example.com',
        password: 'short',
        name: 'New User',
      };

      await authController.register(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should reject registration with invalid email', async () => {
      mockReq.body = {
        email: 'invalid-email',
        password: 'testPassword123',
        name: 'New User',
      };

      await authController.register(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('Login', () => {
    it('should login with valid credentials (providerEmail match)', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'testPassword123',
      };

      // Found via providerEmail
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed_password',
        emailEncrypted: false,
        nameEncrypted: false,
        providerEmail: 'test@example.com',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await authController.login(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          token: 'mock-jwt-token',
        })
      );
    });

    it('should reject login with incorrect password', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'wrongPassword',
      };

      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed_password',
        emailEncrypted: false,
        nameEncrypted: false,
        providerEmail: 'test@example.com',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await authController.login(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('incorrect') })
      );
    });

    it('should reject login with non-existent email', async () => {
      mockReq.body = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      // Not found via providerEmail
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      // No encrypted email users
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      await authController.login(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('incorrect') })
      );
    });
  });

  describe('Profile', () => {
    it('should get profile with valid user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        emailEncrypted: false,
        nameEncrypted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await authController.getProfile(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          user: expect.objectContaining({
            email: 'test@example.com',
          }),
        })
      );
    });

    it('should reject profile request without auth', async () => {
      mockReq.user = undefined;

      await authController.getProfile(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
    });
  });

  describe('Password Change', () => {
    it('should change password with valid current password', async () => {
      mockReq.body = {
        currentPassword: 'currentPass123',
        newPassword: 'newPassword123',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'test-user-id',
        password: 'hashed_password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: 'test-user-id',
      });

      await authController.changePassword(mockReq as Request, mockRes as Response);

      expect(prisma.user.update).toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should reject password change with incorrect current password', async () => {
      mockReq.body = {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword123',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'test-user-id',
        password: 'hashed_password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await authController.changePassword(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid password' })
      );
    });
  });
});
