import { Router } from 'express';
import { userController } from './userController';
import { authenticateToken } from '../auth/authMiddleware';

const router = Router();

// All user routes require authentication
router.use(authenticateToken);

// User profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);

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

export const userRoutes = router;