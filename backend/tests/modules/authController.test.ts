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

// Mock Prisma
jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock jwt
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
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

      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 10);

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
          error: 'Missing required fields',
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
          error: 'Invalid email format',
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
          error: 'Password too short',
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
          error: 'User already exists',
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
          error: 'Missing required fields',
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
          error: 'Invalid credentials',
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
          error: 'Invalid credentials',
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
          error: 'Invalid credentials',
          message: expect.stringContaining('social login'),
        })
      );
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

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);

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
          error: 'Password too short',
        })
      );
    });
  });
});
