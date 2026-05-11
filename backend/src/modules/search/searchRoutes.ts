// backend/src/modules/search/searchRoutes.ts
import { Router } from 'express';
import { searchController } from './searchController';
import { userActionLimiter } from '@/middleware/rateLimiter';

const router = Router();
router.use(userActionLimiter);

// Natural language query → structured filters
router.post('/natural', searchController.parseNaturalQuery);

export const searchRoutes = router;
