// ROADMAP 4.0 G2.2 — city-cuisine recommendations route.
//
// GET /api/city-cuisine/recommendations?city=cdmx&k=5 — top-K dishes the
// authenticated user is most likely to enjoy in the named city, ranked by
// per-user cuisine affinity.

import { Router, type Request, type Response } from 'express';
import { getCityDishRecommendations } from '@/services/cityCuisineService';
import { getUserId } from '@/utils/authHelper';
import { logger } from '@/utils/logger';

const router = Router();

router.get('/recommendations', async (req: Request, res: Response) => {
  const city = (req.query.city as string | undefined) ?? '';
  const kRaw = req.query.k;
  const k = typeof kRaw === 'string' ? Number.parseInt(kRaw, 10) : undefined;
  if (!city.trim()) {
    return res.status(400).json({ error: 'city query param is required' });
  }
  try {
    const userId = getUserId(req);
    const result = await getCityDishRecommendations({
      userId,
      city,
      k: Number.isFinite(k) ? (k as number) : undefined,
    });
    if (!result.city) {
      return res.status(404).json({ error: 'unknown city', city, dishes: [] });
    }
    return res.json({
      city: {
        slug: Object.keys(result.city.aliases).length >= 0 ? city.toLowerCase() : '',
        displayName: result.city.displayName,
        country: result.city.country,
        region: result.city.region,
        latitude: result.city.latitude,
        longitude: result.city.longitude,
      },
      dishes: result.dishes,
    });
  } catch (error) {
    logger.error({ err: error }, 'cityCuisineRoutes.recommendations.failed');
    return res.status(500).json({ error: 'recommendation lookup failed' });
  }
});

export const cityCuisineRouter = router;
