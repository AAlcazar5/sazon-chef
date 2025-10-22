import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';

export const userController = {
  // Get user profile
  async getProfile(req: Request, res: Response) {
    try {
      // TODO: Get user ID from authentication
      const userId = 'temp-user-id'; // Placeholder until auth is implemented
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
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
      
      // Remove sensitive data if needed
      const { ...userData } = user;
      
      res.json(userData);
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  },

  // Update user profile
  async updateProfile(req: Request, res: Response) {
    try {
      // TODO: Get user ID from authentication
      const userId = 'temp-user-id';
      const { name, email } = req.body;
      
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(name && { name }),
          ...(email && { email })
        },
        include: {
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
      
      res.json({ message: 'Profile updated successfully', user });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  },

  // Get user preferences
  async getPreferences(req: Request, res: Response) {
    try {
      // TODO: Get user ID from authentication
      const userId = 'temp-user-id';
      
      const preferences = await prisma.userPreferences.findUnique({
        where: { userId },
        include: {
          bannedIngredients: true,
          likedCuisines: true,
          dietaryRestrictions: true
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
            dietaryRestrictions: true
          }
        });
        return res.json(defaultPreferences);
      }
      
      res.json(preferences);
    } catch (error) {
      console.error('Get preferences error:', error);
      res.status(500).json({ error: 'Failed to fetch user preferences' });
    }
  },

  // Update user preferences
  async updatePreferences(req: Request, res: Response) {
    try {
      // TODO: Get user ID from authentication
      const userId = 'temp-user-id';
      const {
        bannedIngredients,
        likedCuisines,
        dietaryRestrictions,
        cookTimePreference,
        spiceLevel
      } = req.body;
      
      // First, get existing preferences to handle updates
      const existingPreferences = await prisma.userPreferences.findUnique({
        where: { userId },
        include: {
          bannedIngredients: true,
          likedCuisines: true,
          dietaryRestrictions: true
        }
      });

      const updateData: any = {
        ...(cookTimePreference && { cookTimePreference }),
        ...(spiceLevel && { spiceLevel })
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
          create: dietaryRestrictions.map((name: string) => ({ name }))
        };
      }

      const preferences = await prisma.userPreferences.upsert({
        where: { userId },
        update: updateData,
        create: {
          userId,
          cookTimePreference: cookTimePreference || 30,
          spiceLevel: spiceLevel || 'medium',
          bannedIngredients: { create: bannedIngredients?.map((name: string) => ({ name })) || [] },
          likedCuisines: { create: likedCuisines?.map((name: string) => ({ name })) || [] },
          dietaryRestrictions: { create: dietaryRestrictions?.map((name: string) => ({ name })) || [] }
        },
        include: {
          bannedIngredients: true,
          likedCuisines: true,
          dietaryRestrictions: true
        }
      });
      
      res.json({ message: 'Preferences updated successfully', preferences });
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  },

  // Get macro goals
  async getMacroGoals(req: Request, res: Response) {
    try {
      // TODO: Get user ID from authentication
      const userId = 'temp-user-id';
      
      const macroGoals = await prisma.macroGoals.findUnique({
        where: { userId }
      });
      
      if (!macroGoals) {
        // Create default macro goals if they don't exist
        const defaultGoals = await prisma.macroGoals.create({
          data: {
            userId,
            calories: 2000,
            protein: 150,
            carbs: 200,
            fat: 65
          }
        });
        return res.json(defaultGoals);
      }
      
      res.json(macroGoals);
    } catch (error) {
      console.error('Get macro goals error:', error);
      res.status(500).json({ error: 'Failed to fetch macro goals' });
    }
  },

  // Update macro goals
  async updateMacroGoals(req: Request, res: Response) {
    try {
      // TODO: Get user ID from authentication
      const userId = 'temp-user-id';
      const { calories, protein, carbs, fat } = req.body;
      
      if (!calories || !protein || !carbs || !fat) {
        return res.status(400).json({ error: 'All macro fields are required' });
      }
      
      const macroGoals = await prisma.macroGoals.upsert({
        where: { userId },
        update: {
          calories: parseInt(calories),
          protein: parseInt(protein),
          carbs: parseInt(carbs),
          fat: parseInt(fat)
        },
        create: {
          userId,
          calories: parseInt(calories),
          protein: parseInt(protein),
          carbs: parseInt(carbs),
          fat: parseInt(fat)
        }
      });
      
      res.json({ message: 'Macro goals updated successfully', macroGoals });
    } catch (error) {
      console.error('Update macro goals error:', error);
      res.status(500).json({ error: 'Failed to update macro goals' });
    }
  },

  // Get user notifications settings
  async getNotifications(req: Request, res: Response) {
    try {
      // TODO: Implement notifications settings
      // For now, return default settings
      res.json({
        mealReminders: true,
        newRecipes: true,
        goalUpdates: false
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ error: 'Failed to fetch notification settings' });
    }
  },

  // Update user notifications settings
  async updateNotifications(req: Request, res: Response) {
    try {
      // TODO: Implement notifications settings storage
      const { mealReminders, newRecipes, goalUpdates } = req.body;
      
      // For now, just return the updated settings
      const updatedSettings = {
        mealReminders: mealReminders ?? true,
        newRecipes: newRecipes ?? true,
        goalUpdates: goalUpdates ?? false
      };
      
      res.json({ 
        message: 'Notification settings updated successfully', 
        notifications: updatedSettings 
      });
    } catch (error) {
      console.error('Update notifications error:', error);
      res.status(500).json({ error: 'Failed to update notification settings' });
    }
  },

  // Get user meal history
  async getMealHistory(req: Request, res: Response) {
    try {
      // TODO: Get user ID from authentication
      const userId = 'temp-user-id';
      const { startDate, endDate } = req.query;
      
      const where: any = { userId };
      
      if (startDate && endDate) {
        where.date = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        };
      }
      
      const mealHistory = await prisma.mealHistory.findMany({
        where,
        include: {
          recipe: {
            include: {
              ingredients: { orderBy: { order: 'asc' } },
              instructions: { orderBy: { step: 'asc' } }
            }
          }
        },
        orderBy: { date: 'desc' }
      });
      
      res.json(mealHistory);
    } catch (error) {
      console.error('Get meal history error:', error);
      res.status(500).json({ error: 'Failed to fetch meal history' });
    }
  },

  // Get user physical profile
  async getPhysicalProfile(req: Request, res: Response) {
    try {
      const userId = 'temp-user-id';
      
      const profile = await prisma.userPhysicalProfile.findUnique({
        where: { userId }
      });
      
      // Return null if profile doesn't exist (not an error - user just hasn't set it up yet)
      if (!profile) {
        return res.json(null);
      }
      
      res.json(profile);
    } catch (error) {
      console.error('Get physical profile error:', error);
      res.status(500).json({ error: 'Failed to fetch physical profile' });
    }
  },

  // Create or update user physical profile
  async upsertPhysicalProfile(req: Request, res: Response) {
    try {
      const userId = 'temp-user-id';
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
      console.error('Upsert physical profile error:', error);
      res.status(500).json({ error: 'Failed to save physical profile' });
    }
  },

  // Calculate recommended macros based on physical profile
  async calculateRecommendedMacros(req: Request, res: Response) {
    try {
      const userId = 'temp-user-id';

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
      console.error('Calculate macros error:', error);
      res.status(500).json({ error: 'Failed to calculate macros' });
    }
  },

  // Apply calculated macros to user's macro goals
  async applyCalculatedMacros(req: Request, res: Response) {
    try {
      const userId = 'temp-user-id';

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
          fat: recommendations.fat
        },
        create: {
          userId,
          calories: recommendations.calories,
          protein: recommendations.protein,
          carbs: recommendations.carbs,
          fat: recommendations.fat
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
      console.error('Apply calculated macros error:', error);
      res.status(500).json({ error: 'Failed to apply calculated macros' });
    }
  }
};