import { Router } from 'express';
import { userController, uploadProfilePictureMiddleware } from './userController';
import { authenticateToken } from '../auth/authMiddleware';
import { userPresetController } from './userPresetController';

const router = Router();

// All user routes require authentication
router.use(authenticateToken);

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

// Profile preset routes
router.get('/presets', userPresetController.getPresets);
router.post('/presets', userPresetController.createPreset);
router.put('/presets/:id', userPresetController.updatePreset);
router.delete('/presets/:id', userPresetController.deletePreset);
router.post('/presets/:id/apply', userPresetController.applyPreset);

export const userRoutes = router;