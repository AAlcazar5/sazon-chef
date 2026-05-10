// P9 — extracted from lib/api.ts (auth + user)
import { apiClient } from './core';

export const authApi = {
  changePassword: (currentPassword: string, newPassword: string) => {
    return apiClient.put('/auth/password', { currentPassword, newPassword });
  },

  // B2: deleteAccount moved to userApi.deleteAccount (calls /user/account
  // which requires { confirm: 'DELETE' }). The unguarded /auth/account
  // route is being removed.
  deleteAccount: () => {
    return apiClient.delete('/user/account', { data: { confirm: 'DELETE' } });
  },
};

export const userApi = {
  // User preferences
  getPreferences: () => {
    return apiClient.get('/user/preferences');
  },

  updatePreferences: (preferences: any) => {
    return apiClient.put('/user/preferences', preferences);
  },

  // Phase 6 (10Y-C): Pro-gated coach prefs (e.g. weeklyCheckinOptIn).
  // Distinct from updatePreferences which targets the legacy taste profile.
  updateMyPreferences: (patch: { weeklyCheckinOptIn?: boolean }) => {
    return apiClient.patch('/user/preferences/weekly-checkin', patch);
  },

  // ROADMAP 4.0 i18n-OPS4.1: locale override (en, es, es-MX/AR/CO/ES/419, pt, pt-BR/PT).
  updateLocale: (locale: string) => {
    return apiClient.patch('/user/locale', { locale });
  },

  // ROADMAP 4.0 G1.2: bilingual coach-voice override. null clears the override
  // (coach voice falls back to User.locale).
  updateCoachLocale: (coachLocale: string | null) => {
    return apiClient.patch('/user/coach-locale', { coachLocale });
  },

  // Superfood preferences
  getPreferredSuperfoods: () => {
    return apiClient.get('/user/superfoods');
  },

  addPreferredSuperfood: (category: string) => {
    return apiClient.post('/user/superfoods', { category });
  },

  removePreferredSuperfood: (category: string) => {
    return apiClient.delete(`/user/superfoods/${category}`);
  },

  updatePreferredSuperfoods: (categories: string[]) => {
    return apiClient.put('/user/superfoods', { categories });
  },

  // Macro goals
  getMacroGoals: () => {
    return apiClient.get('/user/macro-goals');
  },

  updateMacroGoals: (goals: any) => {
    return apiClient.put('/user/macro-goals', goals);
  },

  // User profile
  getProfile: () => {
    return apiClient.get('/user/profile');
  },

  updateProfile: (profile: any) => {
    return apiClient.put('/user/profile', profile);
  },

  // Notifications
  getNotifications: () => {
    return apiClient.get('/user/notifications');
  },

  updateNotifications: (notifications: any) => {
    return apiClient.put('/user/notifications', notifications);
  },

  // Physical profile
  getPhysicalProfile: () => {
    return apiClient.get('/user/physical-profile');
  },

  updatePhysicalProfile: (profile: any) => {
    return apiClient.put('/user/physical-profile', profile);
  },

  // Macro calculations
  getCalculatedMacros: () => {
    return apiClient.get('/user/calculate-macros');
  },

  applyCalculatedMacros: () => {
    return apiClient.post('/user/apply-calculated-macros');
  },

  // Profile picture
  uploadProfilePicture: (imageUri: string) => {
    const formData = new FormData();
    formData.append('profilePicture', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'profile-picture.jpg',
    } as any);
    return apiClient.upload('/user/profile-picture', formData);
  },

  deleteProfilePicture: () => {
    return apiClient.delete('/user/profile-picture');
  },

  // Profile presets
  getPresets: () => apiClient.get('/user/presets'),

  createPreset: (data: { name: string; description?: string }) => {
    return apiClient.post('/user/presets', data);
  },

  updatePreset: (id: string, data: { name?: string; description?: string }) => {
    return apiClient.put(`/user/presets/${id}`, data);
  },

  deletePreset: (id: string) => {
    return apiClient.delete(`/user/presets/${id}`);
  },

  applyPreset: (id: string) => {
    return apiClient.post(`/user/presets/${id}/apply`);
  },

  // Group 10I: Cooking Journey
  getCookingStats: () => {
    return apiClient.get<{
      recipesCookedThisMonth: number;
      recipesCookedAllTime: number;
      cuisinesExplored: string[];
      cuisinesExploredThisMonth: string[];
      averageDifficulty: number;
      averageDifficultyLabel: 'easy' | 'medium' | 'hard' | null;
      difficultyTrend: 'leveling_up' | 'steady' | 'leveling_down' | 'insufficient_data';
      longestStreakDays: number;
      currentStreakDays: number;
      firstCookedCuisines: Array<{ cuisine: string; firstCookedAt: string }>;
    }>('/user/cooking-stats');
  },

  getSkillProgress: () => {
    return apiClient.get<{
      currentLevel: 'beginner' | 'home_cook' | 'confident' | 'chef';
      effectiveLevel: 'beginner' | 'home_cook' | 'confident' | 'chef';
      readyToLevelUp: boolean;
      nextLevel: 'beginner' | 'home_cook' | 'confident' | 'chef' | null;
      reason: string;
      easyRecipesCookedWithGoodRating: number;
      mediumRecipesCooked: number;
    }>('/user/skill-progress');
  },

  acceptSkillLevelUp: (newLevel: string) => {
    return apiClient.post<{ cookingSkillLevel: string }>('/user/skill-progress/accept', { newLevel });
  },

  seedCookingJourney: (data: { seededCuisines?: string[]; cookingSkillLevel?: string }) => {
    return apiClient.put<{ seededCuisines: string[]; cookingSkillLevel: string | null }>(
      '/user/cooking-journey/seed',
      data,
    );
  },

  // Group 10S: Kitchen IQ progress
  getKitchenIQProgress: () => {
    return apiClient.get<{
      totalCards: number;
      unlockedCount: number;
      unlockedIds: string[];
      newUnlocks: string[];
    }>('/user/kitchen-iq/progress');
  },

  // Group 10R-Phase2: Affinity snapshot (top ingredients × nutrient gaps × goal × recent ingredients)
  getAffinitySnapshot: () => {
    return apiClient.get<{
      topAffinityIngredients: string[];
      rolling7dNutrientGaps: string[];
      goalPhase: 'cut' | 'maintain' | 'bulk' | 'recomp';
      last7DaysIngredients: string[];
    }>('/user/affinity/snapshot');
  },
};
