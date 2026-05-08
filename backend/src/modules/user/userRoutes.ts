import { Router } from 'express';
import { userController, uploadProfilePictureMiddleware } from './userController';
import { authenticateToken } from '../auth/authMiddleware';
import { userPresetController } from './userPresetController';
import { userPreferencesRoutes } from './userPreferencesRoutes';
import { tonightModeRouter } from './userTonightModeRoutes';
import { userLocaleRouter } from './userLocaleRoutes';
import { userCoachLocaleRouter } from './userCoachLocaleRoutes';

const router = Router();

// All user routes require authentication
router.use(authenticateToken);

// Group 10Y Phase 6: weekly check-in opt-in toggle (Pro-gated when enabling).
router.use(userPreferencesRoutes);

// ROADMAP 4.0 T0.1: Tonight Mode toggle (gated by SAZON_TONIGHT_MODE env flag).
router.use(tonightModeRouter);

// ROADMAP 4.0 i18n-OPS4.1: PATCH /user/locale override.
router.use(userLocaleRouter);

// ROADMAP 4.0 G1.2: PATCH /user/coach-locale (coach-voice override).
router.use(userCoachLocaleRouter);

// User profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);

// Profile picture routes
router.post('/profile-picture', uploadProfilePictureMiddleware, userController.uploadProfilePicture);
router.delete('/profile-picture', userController.deleteProfilePicture);

// Preferences routes
router.get('/preferences', userController.getPreferences);
router.put('/preferences', userController.updatePreferences);

// Macro goals routes
router.get('/macro-goals', userController.getMacroGoals);
router.put('/macro-goals', userController.updateMacroGoals);

// Notifications routes
router.get('/notifications', userController.getNotifications);
router.put('/notifications', userController.updateNotifications);

// Meal history routes
router.get('/meal-history', userController.getMealHistory);

// Physical profile routes
router.get('/physical-profile', userController.getPhysicalProfile);
router.put('/physical-profile', userController.upsertPhysicalProfile);

// Macro calculation routes
router.get('/calculate-macros', userController.calculateRecommendedMacros);
router.post('/apply-calculated-macros', userController.applyCalculatedMacros);

// Superfood preferences routes
router.get('/superfoods', userController.getPreferredSuperfoods);
router.post('/superfoods', userController.addPreferredSuperfood);
router.put('/superfoods', userController.updatePreferredSuperfoods);
router.delete('/superfoods/:category', userController.removePreferredSuperfood);

// Group 10I: Cooking Journey
router.get('/cooking-stats', userController.getCookingStats);
router.get('/skill-progress', userController.getSkillProgress);
router.post('/skill-progress/accept', userController.acceptSkillLevelUp);
router.put('/cooking-journey/seed', userController.seedCookingJourney);

// Profile preset routes
router.get('/presets', userPresetController.getPresets);
router.post('/presets', userPresetController.createPreset);
router.put('/presets/:id', userPresetController.updatePreset);
router.delete('/presets/:id', userPresetController.deletePreset);
router.post('/presets/:id/apply', userPresetController.applyPreset);

// GDPR/CCPA + Apple App Store — privacy-required user data controls
router.get('/export-data', userController.exportData);
router.delete('/account', userController.deleteAccount);

export const userRoutes = router;