import { Router } from 'express';
import { userController } from './userController';

const router = Router();

// TODO: Add authentication middleware for all routes below
// All user routes require authentication

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

export const userRoutes = router;