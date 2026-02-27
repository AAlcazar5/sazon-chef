// backend/src/modules/search/searchRoutes.ts
import { Router } from 'express';
import { searchController } from './searchController';

const router = Router();

// Natural language query → structured filters
router.post('/natural', searchController.parseNaturalQuery);

export const searchRoutes = router;
