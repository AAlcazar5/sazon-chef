// backend/src/modules/food/foodRoutes.ts
// 10L: Branded Food & Restaurant Tracking routes

import { Router } from 'express';
import {
  searchFood,
  getRecentFoods,
  getFrequentFoods,
  logFood,
  createUserFoodItem,
} from './foodController';

const router = Router();

router.get('/search', searchFood);
router.get('/recent', getRecentFoods);
router.get('/frequent', getFrequentFoods);
router.post('/log', logFood);
router.post('/items', createUserFoodItem);

export const foodRoutes = router;
