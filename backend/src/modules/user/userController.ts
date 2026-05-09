import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { authenticateToken } from '../auth/authMiddleware';
import { decrypt } from '@/utils/encryption';
import { getUserId } from '@/utils/authHelper';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { logger } from '../../utils/logger';
import {
  computeCookingStats,
  computeSkillProgress,
  SkillLevel,
} from './cookingStatsService';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads', 'profile-pictures');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Allowed profile picture extensions. Anything outside this set falls back
// to .jpg — the original filename is user-controlled and can carry hostile
// suffixes ("..passwd", weird unicode) that we don't want surfacing in URLs
// or filesystem paths. multer normalizes basename so path traversal isn't
// reachable here, but a strict allowlist keeps the served Content-Type
// predictable and the stored filename boring.
const ALLOWED_PICTURE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// Profile pictures are served from the public /uploads static mount
// (NEW-2). The file path is essentially userId + ext; knowledge of a
// userId reveals the URL. This matches the typical "public profile
// picture by URL" pattern (Twitter, GitHub, Slack). If profile pictures
// ever carry sensitive context, migrate to Cloudinary signed URLs.
const profilePictureStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, _file, cb) => {
    const userId = (req as any).user?.id || 'unknown';
    const rawExt = path.extname(_file.originalname).toLowerCase();
    const ext = ALLOWED_PICTURE_EXTS.has(rawExt) ? rawExt : '.jpg';
    cb(null, `${userId}${ext}`);
  },
});

const profilePictureUpload = multer({
  storage: profilePictureStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export const uploadProfilePictureMiddleware = profilePictureUpload.single('profilePicture');

// Group 10I: Safely parse UserPreferences.seededCuisines (JSON-stringified array).
function parseSeededCuisines(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((c): c is string => typeof c === 'string');
  } catch {
    return [];
  }
}

export const userController = {
  // Get user profile
  async getProfile(req: Request, res: Response) {
    try {
      // Get user ID from authentication
      const userId = getUserId(req);
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
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
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Decrypt user data
      const decryptedUser = {
        ...user,
        email: user.emailEncrypted ? decrypt(user.email) : user.email,
        name: user.nameEncrypted ? decrypt(user.name) : user.name
      };

      // Remove encryption flags
      const { emailEncrypted: _, nameEncrypted: __, ...userData } = decryptedUser;
      
      res.json(userData);
    } catch (error) {
      logger.error({ err: error }, 'Get profile error:');
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  },

  // Update user profile
  async updateProfile(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { name, email } = req.body;
      
      const updateData: any = {};
      
      // Encrypt name and email if provided
      const { encrypt } = await import('@/utils/encryption');
      
      if (name) {
        updateData.name = encrypt(name);
        updateData.nameEncrypted = true;
      }
      
      if (email) {
        updateData.email = encrypt(email);
        updateData.emailEncrypted = true;
      }
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
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
      
      // Decrypt for response
      const decryptedUser = {
        ...user,
        email: user.emailEncrypted ? decrypt(user.email) : user.email,
        name: user.nameEncrypted ? decrypt(user.name) : user.name
      };
      
      const { emailEncrypted: _, nameEncrypted: __, ...userResponse } = decryptedUser;
      
      res.json({ message: 'Profile updated successfully', user: userResponse });
    } catch (error) {
      logger.error({ err: error }, 'Update profile error:');
      res.status(500).json({ error: 'Failed to update profile' });
    }
  },

  // Get user preferences
  async getPreferences(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      
      const preferences = await prisma.userPreferences.findUnique({
        where: { userId },
        include: {
          bannedIngredients: true,
          likedCuisines: true,
          dietaryRestrictions: true,
          preferredSuperfoods: true
        }
      });
      
      if (!preferences) {
        // Create default preferences if they don't exist
        const defaultPreferences = await prisma.userPreferences.create({
          data: {
            userId,
            cookTimePreference: 30,
            spiceLevel: 'medium',
            // Use empty create for relational fields
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
        return res.json(defaultPreferences);
      }
      
      res.json(preferences);
    } catch (error) {
      logger.error({ err: error }, 'Get preferences error:');
      res.status(500).json({ error: 'Failed to fetch user preferences' });
    }
  },

  // Update user preferences
  async updatePreferences(req: Request, res: Response) {
    try {
      // TODO: Get user ID from authentication
      const userId = getUserId(req);
      const {
        bannedIngredients,
        likedCuisines,
        dietaryRestrictions,
        preferredSuperfoods,
        cookTimePreference,
        spiceLevel,
        cookingSkillLevel,
        weekdayCookTime,
        weekendCookTime,
      } = req.body;
      
      // First, get existing preferences to handle updates
      const existingPreferences = await prisma.userPreferences.findUnique({
        where: { userId },
        include: {
          bannedIngredients: true,
          likedCuisines: true,
          dietaryRestrictions: true,
          preferredSuperfoods: true
        }
      });

      const updateData: any = {
        ...(cookTimePreference && { cookTimePreference }),
        ...(spiceLevel && { spiceLevel }),
        ...(cookingSkillLevel !== undefined && { cookingSkillLevel }),
        ...(weekdayCookTime !== undefined && { weekdayCookTime }),
        ...(weekendCookTime !== undefined && { weekendCookTime }),
      };

      // Handle relational updates if provided
      if (bannedIngredients) {
        updateData.bannedIngredients = {
          deleteMany: {}, // Delete all existing
          create: bannedIngredients.map((name: string) => ({ name }))
        };
      }

      if (likedCuisines) {
        updateData.likedCuisines = {
          deleteMany: {},
          create: likedCuisines.map((name: string) => ({ name }))
        };
      }

      if (dietaryRestrictions) {
        updateData.dietaryRestrictions = {
          deleteMany: {},
          create: dietaryRestrictions.map((item: string | { name: string; severity?: string }) => {
            if (typeof item === 'string') {
              return { name: item, severity: 'strict' };
            }
            return { name: item.name, severity: item.severity || 'strict' };
          })
        };
      }

      if (preferredSuperfoods) {
        updateData.preferredSuperfoods = {
          deleteMany: {},
          create: preferredSuperfoods.map((category: string) => ({ category }))
        };
      }

      const preferences = await prisma.userPreferences.upsert({
        where: { userId },
        update: updateData,
        create: {
          userId,
          cookTimePreference: cookTimePreference || 30,
          spiceLevel: spiceLevel || 'medium',
          cookingSkillLevel: cookingSkillLevel || null,
          weekdayCookTime: weekdayCookTime ?? null,
          weekendCookTime: weekendCookTime ?? null,
          bannedIngredients: { create: bannedIngredients?.map((name: string) => ({ name })) || [] },
          likedCuisines: { create: likedCuisines?.map((name: string) => ({ name })) || [] },
          dietaryRestrictions: {
            create: dietaryRestrictions?.map((item: string | { name: string; severity?: string }) => {
              if (typeof item === 'string') return { name: item, severity: 'strict' };
              return { name: item.name, severity: item.severity || 'strict' };
            }) || []
          },
          preferredSuperfoods: { create: preferredSuperfoods?.map((category: string) => ({ category })) || [] }
        },
        include: {
          bannedIngredients: true,
          likedCuisines: true,
          dietaryRestrictions: true,
          preferredSuperfoods: true
        }
      });
      
      res.json({ message: 'Preferences updated successfully', preferences });
    } catch (error) {
      logger.error({ err: error }, 'Update preferences error:');
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  },

  // Get macro goals
  async getMacroGoals(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      
      const macroGoals = await prisma.macroGoals.findUnique({
        where: { userId }
      });
      
      if (!macroGoals) {
        // Create default macro goals if they don't exist
        // Fiber default: 14g per 1,000 kcal × 2,000 cal = 28g
        const defaultGoals = await prisma.macroGoals.create({
          data: {
            userId,
            calories: 2000,
            protein: 150,
            carbs: 200,
            fat: 65,
            fiber: 28,
          }
        });
        return res.json(defaultGoals);
      }
      
      res.json(macroGoals);
    } catch (error) {
      logger.error({ err: error }, 'Get macro goals error:');
      res.status(500).json({ error: 'Failed to fetch macro goals' });
    }
  },

  // Update macro goals
  async updateMacroGoals(req: Request, res: Response) {
    try {
      // TODO: Get user ID from authentication
      const userId = getUserId(req);
      const { calories, protein, carbs, fat, fiber } = req.body;

      if (!calories || !protein || !carbs || !fat) {
        return res.status(400).json({ error: 'All macro fields are required' });
      }

      // Derive fiber default from calories if not provided: 14g per 1,000 kcal
      const fiberValue = fiber !== undefined
        ? parseInt(fiber)
        : Math.max(20, Math.round((parseInt(calories) / 1000) * 14));

      const macroGoals = await prisma.macroGoals.upsert({
        where: { userId },
        update: {
          calories: parseInt(calories),
          protein: parseInt(protein),
          carbs: parseInt(carbs),
          fat: parseInt(fat),
          fiber: fiberValue,
        },
        create: {
          userId,
          calories: parseInt(calories),
          protein: parseInt(protein),
          carbs: parseInt(carbs),
          fat: parseInt(fat),
          fiber: fiberValue,
        }
      });
      
      res.json({ message: 'Macro goals updated successfully', macroGoals });
    } catch (error) {
      logger.error({ err: error }, 'Update macro goals error:');
      res.status(500).json({ error: 'Failed to update macro goals' });
    }
  },

  // Get user notifications settings
  async getNotifications(req: Request, res: Response) {
    try {
      const userId = getUserId(req);

      const settings = await prisma.notificationSettings.findUnique({
        where: { userId },
      });

      if (!settings) {
        return res.json({
          mealReminders: true,
          mealReminderTimes: ['08:00', '12:00', '18:00'],
          newRecipes: true,
          goalUpdates: false,
          goalUpdateDay: 'Monday',
          goalUpdateTime: '09:00',
          shoppingReminders: true,
          weeklyInsights: true,
          quietHoursStart: null,
          quietHoursEnd: null,
          weekendsOff: false,
        });
      }

      res.json({
        mealReminders: settings.mealReminders,
        mealReminderTimes: settings.mealReminderTimes
          ? settings.mealReminderTimes.split(',').filter(Boolean)
          : [],
        newRecipes: settings.newRecipes,
        goalUpdates: settings.goalUpdates,
        goalUpdateDay: settings.goalUpdateDay,
        goalUpdateTime: settings.goalUpdateTime,
        shoppingReminders: settings.shoppingReminders,
        weeklyInsights: settings.weeklyInsights,
        quietHoursStart: settings.quietHoursStart,
        quietHoursEnd: settings.quietHoursEnd,
        weekendsOff: settings.weekendsOff,
      });
    } catch (error) {
      logger.error({ err: error }, 'Get notifications error:');
      res.status(500).json({ error: 'Failed to fetch notification settings' });
    }
  },

  // Update user notifications settings
  async updateNotifications(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const {
        mealReminders,
        mealReminderTimes,
        newRecipes,
        goalUpdates,
        goalUpdateDay,
        goalUpdateTime,
        shoppingReminders,
        weeklyInsights,
        quietHoursStart,
        quietHoursEnd,
        weekendsOff,
      } = req.body;

      const timesString = Array.isArray(mealReminderTimes)
        ? mealReminderTimes.join(',')
        : '08:00,12:00,18:00';

      const notifData = {
        mealReminders: mealReminders ?? true,
        mealReminderTimes: timesString,
        newRecipes: newRecipes ?? true,
        goalUpdates: goalUpdates ?? false,
        goalUpdateDay: goalUpdateDay ?? 'Monday',
        goalUpdateTime: goalUpdateTime ?? '09:00',
        shoppingReminders: shoppingReminders ?? true,
        weeklyInsights: weeklyInsights ?? true,
        quietHoursStart: quietHoursStart ?? null,
        quietHoursEnd: quietHoursEnd ?? null,
        weekendsOff: weekendsOff ?? false,
      };

      const settings = await prisma.notificationSettings.upsert({
        where: { userId },
        update: notifData,
        create: { userId, ...notifData },
      });

      res.json({
        message: 'Notification settings updated successfully',
        notifications: {
          mealReminders: settings.mealReminders,
          mealReminderTimes: settings.mealReminderTimes
            ? settings.mealReminderTimes.split(',').filter(Boolean)
            : [],
          newRecipes: settings.newRecipes,
          goalUpdates: settings.goalUpdates,
          goalUpdateDay: settings.goalUpdateDay,
          goalUpdateTime: settings.goalUpdateTime,
          shoppingReminders: settings.shoppingReminders,
          weeklyInsights: settings.weeklyInsights,
          quietHoursStart: settings.quietHoursStart,
          quietHoursEnd: settings.quietHoursEnd,
          weekendsOff: settings.weekendsOff,
        },
      });
    } catch (error) {
      logger.error({ err: error }, 'Update notifications error:');
      res.status(500).json({ error: 'Failed to update notification settings' });
    }
  },

  // Get user meal history
  async getMealHistory(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { startDate, endDate, limit, cursor } = req.query;

      // H8: cap unbounded queries. A 2-year power user with 4 meals/day has
      // ~2,920 history rows; previously this returned all of them with the
      // full nested ingredients + instructions per recipe (~30k child rows).
      // Default cap of 100 covers ~3 weeks of full daily logging — more than
      // any client UI shows at once. Callers needing more pages pass `cursor`.
      const DEFAULT_LIMIT = 100;
      const MAX_LIMIT = 500;
      const parsedLimit = limit ? parseInt(limit as string, 10) : DEFAULT_LIMIT;
      const take = Math.min(
        Math.max(Number.isFinite(parsedLimit) ? parsedLimit : DEFAULT_LIMIT, 1),
        MAX_LIMIT,
      );

      const where: { userId: string; date?: { gte: Date; lte: Date } } = { userId };

      if (startDate && endDate) {
        where.date = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        };
      }

      // H8: list-view shape — drop the heavy nested ingredient/instruction
      // arrays. Recipe detail view already loads those on demand.
      const mealHistory = await prisma.mealHistory.findMany({
        where,
        include: {
          recipe: {
            select: {
              id: true,
              title: true,
              cuisine: true,
              cookTime: true,
              imageUrl: true,
              calories: true,
              protein: true,
              carbs: true,
              fat: true,
            },
          },
        },
        orderBy: { date: 'desc' },
        take,
        ...(cursor
          ? { skip: 1, cursor: { id: cursor as string } }
          : {}),
      });

      // Cursor for next page = id of the last row, or null when fewer than
      // `take` rows came back (end of stream).
      const nextCursor = mealHistory.length === take
        ? mealHistory[mealHistory.length - 1]?.id ?? null
        : null;

      res.json({ items: mealHistory, nextCursor, limit: take });
    } catch (error) {
      logger.error({ err: error }, 'Get meal history error:');
      res.status(500).json({ error: 'Failed to fetch meal history' });
    }
  },

  // Get user physical profile
  async getPhysicalProfile(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      
      const profile = await prisma.userPhysicalProfile.findUnique({
        where: { userId }
      });
      
      // Return null if profile doesn't exist (not an error - user just hasn't set it up yet)
      if (!profile) {
        return res.json(null);
      }
      
      res.json(profile);
    } catch (error) {
      logger.error({ err: error }, 'Get physical profile error:');
      res.status(500).json({ error: 'Failed to fetch physical profile' });
    }
  },

  // Create or update user physical profile
  async upsertPhysicalProfile(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const {
        gender,
        age,
        heightCm,
        weightKg,
        activityLevel,
        fitnessGoal,
        targetWeightKg,
        bodyFatPercentage
      } = req.body;

      // Import calculator functions
      const {
        calculateBMR,
        calculateTDEE,
        validatePhysicalProfile
      } = await import('@/utils/nutritionCalculator');

      // Validate input
      const errors = validatePhysicalProfile({
        gender,
        age,
        heightCm,
        weightKg,
        activityLevel,
        fitnessGoal
      });

      if (errors.length > 0) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors
        });
      }

      // Calculate BMR and TDEE
      const bmr = calculateBMR({
        gender,
        age,
        heightCm,
        weightKg,
        activityLevel,
        fitnessGoal
      });

      const tdee = calculateTDEE(bmr, activityLevel);

      // Upsert profile
      const profile = await prisma.userPhysicalProfile.upsert({
        where: { userId },
        update: {
          gender,
          age: parseInt(age),
          heightCm: parseFloat(heightCm),
          weightKg: parseFloat(weightKg),
          activityLevel,
          fitnessGoal,
          bmr,
          tdee,
          targetWeightKg: targetWeightKg ? parseFloat(targetWeightKg) : null,
          bodyFatPercentage: bodyFatPercentage ? parseFloat(bodyFatPercentage) : null
        },
        create: {
          userId,
          gender,
          age: parseInt(age),
          heightCm: parseFloat(heightCm),
          weightKg: parseFloat(weightKg),
          activityLevel,
          fitnessGoal,
          bmr,
          tdee,
          targetWeightKg: targetWeightKg ? parseFloat(targetWeightKg) : null,
          bodyFatPercentage: bodyFatPercentage ? parseFloat(bodyFatPercentage) : null
        }
      });

      res.json({
        message: 'Physical profile saved successfully',
        profile
      });
    } catch (error) {
      logger.error({ err: error }, 'Upsert physical profile error:');
      res.status(500).json({ error: 'Failed to save physical profile' });
    }
  },

  // Calculate recommended macros based on physical profile
  async calculateRecommendedMacros(req: Request, res: Response) {
    try {
      const userId = getUserId(req);

      // Get physical profile
      const profile = await prisma.userPhysicalProfile.findUnique({
        where: { userId }
      });

      if (!profile) {
        return res.status(400).json({
          error: 'Physical profile required',
          message: 'Please complete your physical profile first to calculate macros'
        });
      }

      // Import calculator
      const { calculateMacros } = await import('@/utils/nutritionCalculator');

      // Calculate macros
      const recommendations = calculateMacros({
        gender: profile.gender,
        age: profile.age,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        activityLevel: profile.activityLevel,
        fitnessGoal: profile.fitnessGoal,
        bodyFatPercentage: profile.bodyFatPercentage || undefined
      });

      res.json(recommendations);
    } catch (error) {
      logger.error({ err: error }, 'Calculate macros error:');
      res.status(500).json({ error: 'Failed to calculate macros' });
    }
  },

  // Apply calculated macros to user's macro goals
  async applyCalculatedMacros(req: Request, res: Response) {
    try {
      const userId = getUserId(req);

      // Get physical profile
      const profile = await prisma.userPhysicalProfile.findUnique({
        where: { userId }
      });

      if (!profile) {
        return res.status(400).json({
          error: 'Physical profile required',
          message: 'Please complete your physical profile first to calculate macros'
        });
      }

      // Calculate macros
      const { calculateMacros } = await import('@/utils/nutritionCalculator');
      const recommendations = calculateMacros({
        gender: profile.gender,
        age: profile.age,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        activityLevel: profile.activityLevel,
        fitnessGoal: profile.fitnessGoal,
        bodyFatPercentage: profile.bodyFatPercentage || undefined
      });

      // Update macro goals
      const macroGoals = await prisma.macroGoals.upsert({
        where: { userId },
        update: {
          calories: recommendations.calories,
          protein: recommendations.protein,
          carbs: recommendations.carbs,
          fat: recommendations.fat,
          fiber: recommendations.fiber,
        },
        create: {
          userId,
          calories: recommendations.calories,
          protein: recommendations.protein,
          carbs: recommendations.carbs,
          fat: recommendations.fat,
          fiber: recommendations.fiber,
        }
      });

      res.json({
        message: 'Macro goals updated successfully',
        macroGoals,
        calculations: {
          bmr: recommendations.bmr,
          tdee: recommendations.tdee
        }
      });
    } catch (error) {
      logger.error({ err: error }, 'Apply calculated macros error:');
      res.status(500).json({ error: 'Failed to apply calculated macros' });
    }
  },

  // Get preferred superfoods
  async getPreferredSuperfoods(req: Request, res: Response) {
    try {
      const userId = getUserId(req); // TODO: Get from authentication
      
      const preferences = await prisma.userPreferences.findUnique({
        where: { userId },
        include: {
          preferredSuperfoods: true
        }
      });
      
      if (!preferences) {
        return res.json({ preferredSuperfoods: [] });
      }
      
      res.json({ preferredSuperfoods: preferences.preferredSuperfoods });
    } catch (error) {
      logger.error({ err: error }, 'Get preferred superfoods error:');
      res.status(500).json({ error: 'Failed to fetch preferred superfoods' });
    }
  },

  // Add preferred superfood
  async addPreferredSuperfood(req: Request, res: Response) {
    try {
      const userId = getUserId(req); // TODO: Get from authentication
      const { category } = req.body;
      
      if (!category || typeof category !== 'string') {
        return res.status(400).json({ error: 'Category is required' });
      }
      
      // Get or create preferences
      let preferences = await prisma.userPreferences.findUnique({
        where: { userId }
      });
      
      if (!preferences) {
        preferences = await prisma.userPreferences.create({
          data: {
            userId,
            cookTimePreference: 30,
            spiceLevel: 'medium'
          }
        });
      }
      
      // Check if superfood already exists
      const existing = await prisma.preferredSuperfood.findFirst({
        where: {
          preferenceId: preferences.id,
          category
        }
      });
      
      if (existing) {
        return res.status(409).json({ error: 'Superfood already in preferences' });
      }
      
      // Add superfood
      const superfood = await prisma.preferredSuperfood.create({
        data: {
          preferenceId: preferences.id,
          category
        }
      });
      
      res.json({ message: 'Superfood added successfully', superfood });
    } catch (error) {
      logger.error({ err: error }, 'Add preferred superfood error:');
      res.status(500).json({ error: 'Failed to add preferred superfood' });
    }
  },

  // Remove preferred superfood
  async removePreferredSuperfood(req: Request, res: Response) {
    try {
      const userId = getUserId(req); // TODO: Get from authentication
      const { category } = req.params;
      
      if (!category) {
        return res.status(400).json({ error: 'Category is required' });
      }
      
      // Get preferences
      const preferences = await prisma.userPreferences.findUnique({
        where: { userId }
      });
      
      if (!preferences) {
        return res.status(404).json({ error: 'Preferences not found' });
      }
      
      // Delete superfood
      const result = await prisma.preferredSuperfood.deleteMany({
        where: {
          preferenceId: preferences.id,
          category
        }
      });
      
      if (result.count === 0) {
        return res.status(404).json({ error: 'Superfood not found in preferences' });
      }
      
      res.json({ message: 'Superfood removed successfully' });
    } catch (error) {
      logger.error({ err: error }, 'Remove preferred superfood error:');
      res.status(500).json({ error: 'Failed to remove preferred superfood' });
    }
  },

  // Update preferred superfoods (replace all)
  async updatePreferredSuperfoods(req: Request, res: Response) {
    try {
      const userId = getUserId(req); // TODO: Get from authentication
      const { categories } = req.body;
      
      if (!Array.isArray(categories)) {
        return res.status(400).json({ error: 'Categories must be an array' });
      }
      
      // Get or create preferences
      let preferences = await prisma.userPreferences.findUnique({
        where: { userId }
      });
      
      if (!preferences) {
        preferences = await prisma.userPreferences.create({
          data: {
            userId,
            cookTimePreference: 30,
            spiceLevel: 'medium'
          }
        });
      }
      
      // Replace all superfoods
      await prisma.preferredSuperfood.deleteMany({
        where: { preferenceId: preferences.id }
      });
      
      if (categories.length > 0) {
        await prisma.preferredSuperfood.createMany({
          data: categories.map((category: string) => ({
            preferenceId: preferences!.id,
            category
          }))
        });
      }
      
      // Fetch updated list
      const updated = await prisma.preferredSuperfood.findMany({
        where: { preferenceId: preferences.id }
      });
      
      res.json({
        message: 'Preferred superfoods updated successfully',
        preferredSuperfoods: updated
      });
    } catch (error) {
      logger.error({ err: error }, 'Update preferred superfoods error:');
      res.status(500).json({ error: 'Failed to update preferred superfoods' });
    }
  },

  // Upload profile picture
  async uploadProfilePicture(req: Request, res: Response) {
    try {
      const userId = getUserId(req);

      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const profilePictureUrl = `/uploads/profile-pictures/${req.file.filename}`;

      await prisma.user.update({
        where: { id: userId },
        data: { profilePictureUrl },
      });

      res.json({
        message: 'Profile picture uploaded successfully',
        profilePictureUrl,
      });
    } catch (error) {
      logger.error({ err: error }, 'Upload profile picture error:');
      res.status(500).json({ error: 'Failed to upload profile picture' });
    }
  },

  // Delete profile picture
  async deleteProfilePicture(req: Request, res: Response) {
    try {
      const userId = getUserId(req);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { profilePictureUrl: true },
      });

      if (user?.profilePictureUrl) {
        const filePath = path.join(process.cwd(), user.profilePictureUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      await prisma.user.update({
        where: { id: userId },
        data: { profilePictureUrl: null },
      });

      res.json({ message: 'Profile picture removed successfully' });
    } catch (error) {
      logger.error({ err: error }, 'Delete profile picture error:');
      res.status(500).json({ error: 'Failed to remove profile picture' });
    }
  },

  // Group 10I: Cooking Journey stats
  async getCookingStats(req: Request, res: Response) {
    try {
      const userId = getUserId(req);

      const [logs, preferences] = await Promise.all([
        prisma.cookingLog.findMany({
          where: { userId },
          select: {
            cookedAt: true,
            recipe: { select: { cuisine: true, difficulty: true } },
          },
          orderBy: { cookedAt: 'desc' },
        }),
        prisma.userPreferences.findUnique({
          where: { userId },
          select: { seededCuisines: true },
        }),
      ]);

      const seeded = parseSeededCuisines(preferences?.seededCuisines);
      const stats = computeCookingStats(logs, new Date(), seeded);
      res.json({ ...stats, seededCuisines: seeded });
    } catch (error) {
      logger.error({ err: error }, 'Get cooking stats error:');
      res.status(500).json({ error: 'Failed to fetch cooking stats' });
    }
  },

  // Group 10I: Seed cooking journey — user edits their skill + known cuisines
  async seedCookingJourney(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { seededCuisines, cookingSkillLevel } = req.body as {
        seededCuisines?: unknown;
        cookingSkillLevel?: unknown;
      };

      if (seededCuisines !== undefined && !Array.isArray(seededCuisines)) {
        return res.status(400).json({ error: 'seededCuisines must be an array' });
      }
      const cleaned =
        Array.isArray(seededCuisines)
          ? seededCuisines
              .filter((c): c is string => typeof c === 'string')
              .map((c) => c.trim())
              .filter((c) => c.length > 0 && c.length <= 60)
          : undefined;
      const uniqueCleaned = cleaned ? [...new Set(cleaned)] : undefined;

      const allowedLevels = ['beginner', 'home_cook', 'confident', 'chef'];
      if (
        cookingSkillLevel !== undefined &&
        (typeof cookingSkillLevel !== 'string' || !allowedLevels.includes(cookingSkillLevel))
      ) {
        return res.status(400).json({ error: 'Invalid cookingSkillLevel' });
      }

      const updateData: {
        seededCuisines?: string;
        cookingSkillLevel?: string;
      } = {};
      if (uniqueCleaned !== undefined) {
        updateData.seededCuisines = JSON.stringify(uniqueCleaned);
      }
      if (typeof cookingSkillLevel === 'string') {
        updateData.cookingSkillLevel = cookingSkillLevel;
      }

      const prefs = await prisma.userPreferences.upsert({
        where: { userId },
        update: updateData,
        create: {
          userId,
          cookTimePreference: 30,
          ...updateData,
        },
        select: { seededCuisines: true, cookingSkillLevel: true },
      });

      res.json({
        seededCuisines: parseSeededCuisines(prefs.seededCuisines),
        cookingSkillLevel: prefs.cookingSkillLevel,
      });
    } catch (error) {
      logger.error({ err: error }, 'Seed cooking journey error:');
      res.status(500).json({ error: 'Failed to seed cooking journey' });
    }
  },

  // Group 10I: Skill progression evaluation
  async getSkillProgress(req: Request, res: Response) {
    try {
      const userId = getUserId(req);

      const preferences = await prisma.userPreferences.findUnique({
        where: { userId },
        select: { cookingSkillLevel: true },
      });

      const currentLevel = (preferences?.cookingSkillLevel as SkillLevel) || 'beginner';

      // Pair CookingLog with Meal.tasteRating (via recipeId, most recent meal per recipe)
      const logs = await prisma.cookingLog.findMany({
        where: { userId },
        select: {
          recipeId: true,
          cookedAt: true,
          recipe: { select: { difficulty: true } },
        },
        orderBy: { cookedAt: 'desc' },
      });

      const recipeIds = [...new Set(logs.map((l) => l.recipeId))];
      const meals = recipeIds.length
        ? await prisma.meal.findMany({
            where: {
              mealPlan: { userId },
              recipeId: { in: recipeIds },
              tasteRating: { not: null },
            },
            select: { recipeId: true, tasteRating: true },
          })
        : [];

      const ratingByRecipe = new Map<string, number>();
      for (const meal of meals) {
        if (meal.recipeId && meal.tasteRating != null && !ratingByRecipe.has(meal.recipeId)) {
          ratingByRecipe.set(meal.recipeId, meal.tasteRating);
        }
      }

      const logsWithRatings = logs.map((l) => ({
        difficulty: l.recipe?.difficulty ?? null,
        tasteRating: ratingByRecipe.get(l.recipeId) ?? null,
      }));

      const progress = computeSkillProgress({
        currentLevel,
        cookingLogsWithRatings: logsWithRatings,
      });
      res.json(progress);
    } catch (error) {
      logger.error({ err: error }, 'Get skill progress error:');
      res.status(500).json({ error: 'Failed to fetch skill progress' });
    }
  },

  // Group 10I: Accept the skill-up nudge — bumps cookingSkillLevel
  async acceptSkillLevelUp(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { newLevel } = req.body as { newLevel?: string };

      const allowed: SkillLevel[] = ['beginner', 'home_cook', 'confident', 'chef'];
      if (!newLevel || !allowed.includes(newLevel as SkillLevel)) {
        return res.status(400).json({ error: 'Invalid skill level' });
      }

      const preferences = await prisma.userPreferences.upsert({
        where: { userId },
        update: { cookingSkillLevel: newLevel },
        create: { userId, cookTimePreference: 30, cookingSkillLevel: newLevel },
        select: { cookingSkillLevel: true },
      });

      res.json({ cookingSkillLevel: preferences.cookingSkillLevel });
    } catch (error) {
      logger.error({ err: error }, 'Accept skill level-up error:');
      res.status(500).json({ error: 'Failed to update skill level' });
    }
  },

  /**
   * GET /api/user/export-data
   *
   * GDPR / CCPA / Apple App Review — return everything we have about the
   * caller as a JSON download. Encrypted fields are decrypted before
   * inclusion (the user has the right to see their own data, not the
   * cipher). Passwords and reset codes are intentionally omitted.
   *
   * Streams as application/json with a Content-Disposition attachment so
   * mobile clients can save it via the share sheet.
   */
  async exportData(req: Request, res: Response) {
    try {
      const userId = getUserId(req);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          preferences: {
            include: {
              bannedIngredients: true,
              likedCuisines: true,
              dietaryRestrictions: true,
              preferredSuperfoods: true,
            },
          },
          macroGoals: true,
          physicalProfile: true,
          savedRecipes: true,
          collections: true,
          feedback: true,
          mealHistory: true,
          mealPlans: true,
          shoppingLists: { include: { items: true } },
          createdRecipes: { include: { ingredients: true, instructions: true } },
          mealPrepPortions: true,
          mealPrepSessions: true,
          mealPrepTemplates: true,
          weightLogs: true,
          weightGoals: true,
          purchaseHistory: true,
          pantryItems: true,
          mealPlanTemplates: true,
          recipeViews: true,
          cookingLogs: true,
          recurringMeals: true,
          notificationSettings: true,
          profilePresets: true,
          searchQueries: true,
          pushTokens: true,
          cravingSearchEvents: true,
          mealComponents: true,
          composedPlates: true,
          slotAffinities: true,
          pairAffinities: true,
          leftoverInventory: true,
          plateShares: true,
          plateSaves: true,
          householdMembers: true,
          composedFamilyMeals: true,
          coachConversations: true,
          coachMessages: true,
          coachMemories: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Decrypt PII fields if present
      const decryptedEmail = user.emailEncrypted ? decrypt(user.email) : user.email;
      const decryptedName = user.nameEncrypted ? decrypt(user.name) : user.name;

      // Strip credentials and reset state — never returned even to the user.
      const {
        password: _pw,
        resetCode: _rc,
        resetCodeExpiry: _rce,
        emailEncrypted: _ee,
        nameEncrypted: _ne,
        ...exportableUser
      } = user;

      const payload = {
        exportedAt: new Date().toISOString(),
        user: { ...exportableUser, email: decryptedEmail, name: decryptedName },
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="sazon-data-${userId}-${Date.now()}.json"`,
      );
      res.json(payload);
    } catch (error) {
      logger.error({ err: error }, 'Export data error:');
      res.status(500).json({ error: 'Failed to export account data' });
    }
  },

  /**
   * DELETE /api/user/account
   *
   * GDPR / CCPA / Apple App Review — permanently delete the caller's
   * account and every owned record. Cascades through Prisma's
   * onDelete: Cascade across the User relations.
   *
   * Required confirmation: the body must include `confirm: 'DELETE'` to
   * prevent accidental triggers. Email/password is not re-asked because
   * the JWT requirement already proves possession of the account; if the
   * JWT is stolen, the attacker can do anything else regardless.
   *
   * Side effects: revokes Stripe subscription if present, removes push
   * tokens, drops local /uploads/profile-pictures/<userId>.* file. Coach
   * conversation history at Anthropic is governed by the zero-data-
   * retention agreement (no manual deletion required).
   */
  async deleteAccount(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
      const { confirm } = req.body ?? {};

      if (confirm !== 'DELETE') {
        return res.status(400).json({
          error: 'CONFIRMATION_REQUIRED',
          message:
            'Account deletion requires { "confirm": "DELETE" } in the request body.',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, profilePictureUrl: true },
      });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Best-effort: remove the local profile-picture file if it exists.
      // Stored as `${userId}${ext}` under uploadsDir so we know the prefix.
      try {
        const files = fs.readdirSync(uploadsDir);
        for (const f of files) {
          if (f.startsWith(`${userId}.`)) {
            fs.unlinkSync(path.join(uploadsDir, f));
          }
        }
      } catch {
        // Non-fatal — the row still gets deleted.
      }

      // Cascade delete via Prisma. Every child relation declares
      // onDelete: Cascade (verified at schema level), so this single
      // call drops every owned row across the schema.
      await prisma.user.delete({ where: { id: userId } });

      res.json({ success: true, deletedAt: new Date().toISOString() });
    } catch (error) {
      logger.error({ err: error }, 'Delete account error:');
      res.status(500).json({ error: 'Failed to delete account' });
    }
  },
};