// backend/tests/modules/authMiddleware.test.ts
// Tests for authentication middleware

import { Request, Response, NextFunction } from 'express';
import { authenticateToken, optionalAuth } from '../../src/modules/auth/authMiddleware';
import * as jwt from 'jsonwebtoken';

// Mock jwt
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      headers: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token', () => {
      const token = 'valid-token';
      mockReq.headers = {
        authorization: `Bearer ${token}`,
      };

      (jwt.verify as jest.Mock).mockImplementation((token, secret, callback) => {
        callback(null, { id: 'user-123', email: 'test@example.com' });
      });

      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(jwt.verify).toHaveBeenCalledWith(
        token,
        expect.any(String),
        expect.any(Function)
      );

      expect(mockReq.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
      });

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject request without token', () => {
      mockReq.headers = {};

      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized',
        })
      );

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', () => {
      const token = 'invalid-token';
      mockReq.headers = {
        authorization: `Bearer ${token}`,
      };

      (jwt.verify as jest.Mock).mockImplementation((token, secret, callback) => {
        callback(new Error('Invalid token'), null);
      });

      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid token',
        })
      );

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with expired token', () => {
      const token = 'expired-token';
      mockReq.headers = {
        authorization: `Bearer ${token}`,
      };

      (jwt.verify as jest.Mock).mockImplementation((token, secret, callback) => {
        const error = new Error('Token expired');
        (error as any).name = 'TokenExpiredError';
        callback(error, null);
      });

      authenticateToken(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should authenticate if token is provided', () => {
      const token = 'valid-token';
      mockReq.headers = {
        authorization: `Bearer ${token}`,
      };

      (jwt.verify as jest.Mock).mockImplementation((token, secret, callback) => {
        callback(null, { id: 'user-123', email: 'test@example.com' });
      });

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
      });

      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without authentication if no token', () => {
      mockReq.headers = {};

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication if token is invalid', () => {
      const token = 'invalid-token';
      mockReq.headers = {
        authorization: `Bearer ${token}`,
      };

      (jwt.verify as jest.Mock).mockImplementation((token, secret, callback) => {
        callback(new Error('Invalid token'), null);
      });

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});

