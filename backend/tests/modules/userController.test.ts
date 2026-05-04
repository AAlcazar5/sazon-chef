import { Request, Response } from 'express';
import { userController } from '../../src/modules/user/userController';
import { prisma } from '../../src/lib/prisma';

// Mock Prisma
jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    userPreferences: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn()
    },
    macroGoals: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn()
    },
    userPhysicalProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn()
    },
    bannedIngredient: {
      deleteMany: jest.fn()
    },
    likedCuisine: {
      deleteMany: jest.fn()
    },
    dietaryRestriction: {
      deleteMany: jest.fn()
    }
  }
}));

// Mock encryption module
jest.mock('../../src/utils/encryption', () => ({
  encrypt: (val: string) => `encrypted_${val}`,
  decrypt: (val: string) => val.startsWith('encrypted_') ? val.replace('encrypted_', '') : val
}));

describe('User Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      params: {},
      body: {},
      user: { id: 'test-user-id', email: 'test@example.com' }
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('getProfile', () => {
    test('should get user profile with preferences and macro goals', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        emailEncrypted: false,
        nameEncrypted: false,
        provider: 'email',
        profilePictureUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        preferences: {
          cookTimePreference: 30,
          spiceLevel: 'medium',
          bannedIngredients: [],
          likedCuisines: [],
          dietaryRestrictions: []
        },
        macroGoals: {
          calories: 2000,
          protein: 150,
          carbs: 200,
          fat: 80
        }
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await userController.getProfile(mockReq as Request, mockRes as Response);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        select: {
          id: true,
          email: true,
          name: true,
          emailEncrypted: true,
          nameEncrypted: true,
          provider: true,
          profilePictureUrl: true,
          createdAt: true,
          updatedAt: true,
          preferences: {
            include: {
              bannedIngredients: true,
              likedCuisines: true,
              dietaryRestrictions: true
            }
          },
          macroGoals: true
        }
      });

      // Response strips emailEncrypted/nameEncrypted flags
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
        })
      );
    });

    test('should return 404 for non-existent user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await userController.getProfile(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'User not found'
      });
    });
  });

  describe('updateProfile', () => {
    test('should update user profile with encryption', async () => {
      const mockUser = {
        id: 'test-user-id',
        name: 'encrypted_Updated Name',
        email: 'encrypted_updated@example.com',
        emailEncrypted: true,
        nameEncrypted: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      mockReq.body = {
        name: 'Updated Name',
        email: 'updated@example.com'
      };

      await userController.updateProfile(mockReq as Request, mockRes as Response);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
        data: {
          name: 'encrypted_Updated Name',
          nameEncrypted: true,
          email: 'encrypted_updated@example.com',
          emailEncrypted: true
        },
        select: {
          id: true,
          email: true,
          name: true,
          emailEncrypted: true,
          nameEncrypted: true,
          createdAt: true,
          updatedAt: true
        }
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Profile updated successfully',
        user: expect.objectContaining({
          id: 'test-user-id',
          name: 'Updated Name',
          email: 'updated@example.com'
        })
      });
    });
  });

  describe('getPreferences', () => {
    test('should get existing preferences', async () => {
      const mockPreferences = {
        id: 'pref-1',
        userId: 'test-user-id',
        cookTimePreference: 30,
        spiceLevel: 'medium',
        bannedIngredients: [],
        likedCuisines: [],
        dietaryRestrictions: [],
        preferredSuperfoods: []
      };

      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue(mockPreferences);

      await userController.getPreferences(mockReq as Request, mockRes as Response);

      expect(prisma.userPreferences.findUnique).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        include: {
          bannedIngredients: true,
          likedCuisines: true,
          dietaryRestrictions: true,
          preferredSuperfoods: true
        }
      });

      expect(mockRes.json).toHaveBeenCalledWith(mockPreferences);
    });

    test('should create default preferences if none exist', async () => {
      const mockDefaultPreferences = {
        id: 'pref-1',
        userId: 'test-user-id',
        cookTimePreference: 30,
        spiceLevel: 'medium',
        bannedIngredients: [],
        likedCuisines: [],
        dietaryRestrictions: [],
        preferredSuperfoods: []
      };

      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.userPreferences.create as jest.Mock).mockResolvedValue(mockDefaultPreferences);

      await userController.getPreferences(mockReq as Request, mockRes as Response);

      expect(prisma.userPreferences.create).toHaveBeenCalledWith({
        data: {
          userId: 'test-user-id',
          cookTimePreference: 30,
          spiceLevel: 'medium',
          bannedIngredients: { create: [] },
          likedCuisines: { create: [] },
          dietaryRestrictions: { create: [] }
        },
        include: {
          bannedIngredients: true,
          likedCuisines: true,
          dietaryRestrictions: true,
          preferredSuperfoods: true
        }
      });

      expect(mockRes.json).toHaveBeenCalledWith(mockDefaultPreferences);
    });
  });

  describe('updatePreferences', () => {
    test('should update preferences successfully', async () => {
      const mockUpdatedPreferences = {
        id: 'pref-1',
        userId: 'test-user-id',
        cookTimePreference: 45,
        spiceLevel: 'spicy',
        bannedIngredients: [{ name: 'mushrooms' }],
        likedCuisines: [{ name: 'Italian' }],
        dietaryRestrictions: [{ name: 'vegetarian', severity: 'strict' }],
        preferredSuperfoods: []
      };

      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.userPreferences.upsert as jest.Mock).mockResolvedValue(mockUpdatedPreferences);

      mockReq.body = {
        cookTimePreference: 45,
        spiceLevel: 'spicy',
        bannedIngredients: ['mushrooms'],
        likedCuisines: ['Italian'],
        dietaryRestrictions: ['vegetarian']
      };

      await userController.updatePreferences(mockReq as Request, mockRes as Response);

      expect(prisma.userPreferences.upsert).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        update: expect.objectContaining({
          cookTimePreference: 45,
          spiceLevel: 'spicy'
        }),
        create: expect.objectContaining({
          userId: 'test-user-id',
          cookTimePreference: 45,
          spiceLevel: 'spicy'
        }),
        include: {
          bannedIngredients: true,
          likedCuisines: true,
          dietaryRestrictions: true,
          preferredSuperfoods: true
        }
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Preferences updated successfully',
        preferences: mockUpdatedPreferences
      });
    });
  });

  describe('getPhysicalProfile', () => {
    test('should get existing physical profile', async () => {
      const mockProfile = {
        id: 'profile-1',
        userId: 'test-user-id',
        gender: 'male',
        age: 30,
        heightCm: 180,
        weightKg: 80,
        activityLevel: 'moderately_active',
        fitnessGoal: 'maintain',
        bmr: 1800,
        tdee: 2300
      };

      (prisma.userPhysicalProfile.findUnique as jest.Mock).mockResolvedValue(mockProfile);

      await userController.getPhysicalProfile(mockReq as Request, mockRes as Response);

      expect(prisma.userPhysicalProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' }
      });

      expect(mockRes.json).toHaveBeenCalledWith(mockProfile);
    });

    test('should return null if no physical profile exists', async () => {
      (prisma.userPhysicalProfile.findUnique as jest.Mock).mockResolvedValue(null);

      await userController.getPhysicalProfile(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(null);
    });
  });

  describe('upsertPhysicalProfile', () => {
    test('should create new physical profile', async () => {
      const profileData = {
        gender: 'male',
        age: 30,
        heightCm: 180,
        weightKg: 80,
        activityLevel: 'moderately_active',
        fitnessGoal: 'maintain'
      };

      const mockProfile = {
        id: 'profile-1',
        userId: 'test-user-id',
        ...profileData,
        bmr: 1800,
        tdee: 2300
      };

      (prisma.userPhysicalProfile.upsert as jest.Mock).mockResolvedValue(mockProfile);

      mockReq.body = profileData;

      await userController.upsertPhysicalProfile(mockReq as Request, mockRes as Response);

      expect(prisma.userPhysicalProfile.upsert).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        update: expect.objectContaining({
          gender: 'male',
          age: 30,
          heightCm: 180,
          weightKg: 80
        }),
        create: expect.objectContaining({
          userId: 'test-user-id',
          gender: 'male',
          age: 30,
          heightCm: 180,
          weightKg: 80
        })
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Physical profile saved successfully',
        profile: mockProfile
      });
    });
  });

  describe('calculateRecommendedMacros', () => {
    test('should calculate macros from physical profile', async () => {
      const mockProfile = {
        id: 'profile-1',
        userId: 'test-user-id',
        gender: 'male',
        age: 30,
        heightCm: 180,
        weightKg: 80,
        activityLevel: 'moderately_active',
        fitnessGoal: 'maintain',
        bmr: 1800,
        tdee: 2300,
        bodyFatPercentage: null
      };

      (prisma.userPhysicalProfile.findUnique as jest.Mock).mockResolvedValue(mockProfile);

      await userController.calculateRecommendedMacros(mockReq as Request, mockRes as Response);

      expect(prisma.userPhysicalProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' }
      });

      // Should return calculated macro recommendations
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          bmr: expect.any(Number),
          tdee: expect.any(Number),
          calories: expect.any(Number),
          protein: expect.any(Number),
          carbs: expect.any(Number),
          fat: expect.any(Number)
        })
      );
    });

    test('should return error if no physical profile exists', async () => {
      (prisma.userPhysicalProfile.findUnique as jest.Mock).mockResolvedValue(null);

      await userController.calculateRecommendedMacros(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Physical profile required',
        message: 'Please complete your physical profile first to calculate macros'
      });
    });
  });

  describe('applyCalculatedMacros', () => {
    test('should apply calculated macros to macro goals', async () => {
      const mockProfile = {
        id: 'profile-1',
        userId: 'test-user-id',
        gender: 'male',
        age: 30,
        heightCm: 180,
        weightKg: 80,
        activityLevel: 'moderately_active',
        fitnessGoal: 'maintain',
        bmr: 1800,
        tdee: 2300,
        bodyFatPercentage: null
      };

      const mockMacroGoals = {
        id: 'goals-1',
        userId: 'test-user-id',
        calories: 2300,
        protein: 128,
        carbs: 230,
        fat: 77
      };

      (prisma.userPhysicalProfile.findUnique as jest.Mock).mockResolvedValue(mockProfile);
      (prisma.macroGoals.upsert as jest.Mock).mockResolvedValue(mockMacroGoals);

      await userController.applyCalculatedMacros(mockReq as Request, mockRes as Response);

      expect(prisma.macroGoals.upsert).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        update: expect.objectContaining({
          calories: expect.any(Number),
          protein: expect.any(Number),
          carbs: expect.any(Number),
          fat: expect.any(Number)
        }),
        create: expect.objectContaining({
          userId: 'test-user-id',
          calories: expect.any(Number),
          protein: expect.any(Number),
          carbs: expect.any(Number),
          fat: expect.any(Number)
        })
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Macro goals updated successfully',
        macroGoals: mockMacroGoals,
        calculations: expect.objectContaining({
          bmr: expect.any(Number),
          tdee: expect.any(Number)
        })
      });
    });

    test('should return error if no physical profile exists', async () => {
      (prisma.userPhysicalProfile.findUnique as jest.Mock).mockResolvedValue(null);

      await userController.applyCalculatedMacros(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Physical profile required',
        message: 'Please complete your physical profile first to calculate macros'
      });
    });
  });

  describe('deleteAccount', () => {
    beforeEach(() => {
      (prisma.user as any).delete = jest.fn();
    });

    test('rejects without confirmation token', async () => {
      mockReq.body = {};
      await userController.deleteAccount(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'CONFIRMATION_REQUIRED' }),
      );
      expect((prisma.user as any).delete).not.toHaveBeenCalled();
    });

    test('rejects with wrong confirmation string', async () => {
      mockReq.body = { confirm: 'delete' }; // lowercase, must be exact 'DELETE'
      await userController.deleteAccount(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect((prisma.user as any).delete).not.toHaveBeenCalled();
    });

    test('returns 404 when user no longer exists', async () => {
      mockReq.body = { confirm: 'DELETE' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
      await userController.deleteAccount(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect((prisma.user as any).delete).not.toHaveBeenCalled();
    });

    test('cascades delete when confirmation is correct', async () => {
      mockReq.body = { confirm: 'DELETE' };
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'test-user-id',
        profilePictureUrl: null,
      });
      (prisma.user as any).delete.mockResolvedValueOnce({ id: 'test-user-id' });
      await userController.deleteAccount(mockReq as Request, mockRes as Response);
      expect((prisma.user as any).delete).toHaveBeenCalledWith({
        where: { id: 'test-user-id' },
      });
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });
  });

  describe('exportData', () => {
    test('returns 404 when user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
      await userController.exportData(mockReq as Request, mockRes as Response);
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    test('strips password and reset code from the export payload', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'test-user-id',
        email: 'alex@example.com',
        name: 'Alex',
        password: 'hashed-pw-MUST-NOT-LEAK',
        resetCode: '123456',
        resetCodeExpiry: new Date(),
        emailEncrypted: false,
        nameEncrypted: false,
        savedRecipes: [],
        coachMessages: [],
      });
      mockRes.setHeader = jest.fn();
      await userController.exportData(mockReq as Request, mockRes as Response);
      const payload = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(payload.user.password).toBeUndefined();
      expect(payload.user.resetCode).toBeUndefined();
      expect(payload.user.email).toBe('alex@example.com');
    });
  });
});
