import * as Sentry from '@sentry/node';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { recipeRoutes } from '@modules/recipe/recipeRoutes';
import { userRoutes } from '@modules/user/userRoutes';
import { healthMetricsRoutes } from '@modules/healthMetrics/healthMetricsRoutes';
import { weightGoalRoutes } from '@modules/weightGoal/weightGoalRoutes';
import mealPlanRoutes from '@modules/mealPlan/mealPlanRoutes';
import { dailySuggestionsRoutes } from '@modules/dailySuggestions/dailySuggestionsRoutes';
import { mealHistoryRoutes } from '@modules/mealHistory/mealHistoryRoutes';
import { mealPrepRoutes } from '@modules/mealPrep/mealPrepRoutes';
import aiRecipeRoutes from '@modules/aiRecipe/aiRecipeRoutes';
import { scannerRoutes } from '@modules/scanner/scannerRoutes';
import { foodRoutes } from '@modules/food/foodRoutes';
import shoppingListRoutes from '@modules/shoppingList/shoppingListRoutes';
import shoppingAppRoutes from '@modules/shoppingList/shoppingAppRoutes';
import shoppingListShareRoutes from '@modules/shoppingListShare/shoppingListShareRoutes';
import costTrackingRoutes from '@modules/costTracking/costTrackingRoutes';
import ingredientAvailabilityRoutes from '@modules/ingredientAvailability/ingredientAvailabilityRoutes';
import pantryRoutes from '@modules/pantry/pantryRoutes';
import { mealComponentRoutes, composedPlateRoutes, leftoverInventoryRoutes, sharedPlateRoutes, nutrientGapRoutes, householdRoutes } from '@modules/mealComponent/mealComponentRoutes';
import { kitchenIQRoutes } from '@modules/kitchenIQ/kitchenIQRoutes';
import { coachRoutes } from '@modules/coach/coachRoutes';
import { affinityRoutes } from '@modules/affinity/affinityRoutes';
import { surfaceEventRoutes } from '@modules/telemetry/surfaceEventRoutes';
import { dailyCheckInRoutes } from '@modules/dailyCheckIn/dailyCheckInRoutes';
import { weeklyRecapRoutes } from '@modules/recap/weeklyRecapRoutes';
import { culturalPrimerRoutes } from '@modules/culturalPrimer/culturalPrimerRoutes';
import { drinkPairingRoutes } from '@modules/drinkPairing/drinkPairingRoutes';
import { cohortSocialProofRoutes } from '@modules/cohortSocialProof/cohortSocialProofRoutes';
import { quipsRoutes } from '@modules/quips/quipsRoutes';
import { firstCookStatsRoutes } from '@modules/firstCookStats/firstCookStatsRoutes';
import uploadRoutes from '@modules/upload/uploadRoute';
import { authRoutes } from '@modules/auth/authRoutes';
import { authenticateToken } from '@modules/auth/authMiddleware';
import { searchRoutes } from '@modules/search/searchRoutes';
import { notificationsRoutes } from '@modules/notifications/notificationsRoutes';
import { stripeRoutes } from '@modules/stripe/stripeRoutes';
import { revenuecatRoutes } from '@modules/revenuecat/revenuecatRoutes';
import { nutritionRoutes } from '@modules/nutrition/nutritionRoutes';
import { followsRoutes } from '@modules/follows/followsRoutes';
import { apiLimiter } from './middleware/rateLimiter';
import { prisma } from '@/lib/prisma';
import { cacheService } from '@/utils/cacheService';
import { logger } from '@/utils/logger';

import type { Request, Response, NextFunction } from 'express';

// ─── Sentry ──────────────────────────────────────────────────────────────────
// Initialise early so it can capture errors from all subsequent code.
// SENTRY_DSN must be set in env to enable error tracking; safe to omit in dev.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [Sentry.expressIntegration()],
  });
}

// ─── Allowed origins ─────────────────────────────────────────────────────────
// In production, list every origin that is allowed to call the API.
// Expo Go uses exp:// or exps://; EAS builds use the custom scheme or HTTPS.
const ALLOWED_ORIGINS: (string | RegExp)[] = [
  // Explicit env var (e.g. https://sazonchef.com)
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  // Expo Go on LAN (any port)
  /^exp:\/\//,
  /^exps:\/\//,
  // Local dev / Metro bundler
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

// ─── App ─────────────────────────────────────────────────────────────────────
const app = express();

// Sentry v8+: request context is captured automatically via expressIntegration

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server requests (no Origin header) and all origins in dev
    if (!origin || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    const allowed = ALLOWED_ORIGINS.some((o) =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    if (allowed) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-data-sharing-enabled',
    'x-analytics-enabled',
    'x-location-services-enabled',
  ],
}));

// HTTP logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static uploads (profile pictures, etc.)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Rate limiting on all /api routes
app.use('/api', apiLimiter);

// ─── Health checks ───────────────────────────────────────────────────────────

// Simple liveness probe (kept at /health for backward compat with startup logs)
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

// Full readiness probe — checks DB + cache, returns response time
app.get('/api/health', async (_req: Request, res: Response) => {
  const start = Date.now();

  let dbStatus: 'ok' | 'error' = 'ok';
  let dbLatencyMs: number | null = null;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
  } catch {
    dbStatus = 'error';
  }

  const cacheStats = cacheService.getStats();

  const responseTimeMs = Date.now() - start;
  const isHealthy = dbStatus === 'ok';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    responseTimeMs,
    services: {
      database: { status: dbStatus, latencyMs: dbLatencyMs },
      cache: { status: 'ok', size: cacheStats.size, maxSize: cacheStats.maxSize },
    },
  });
});

// ─── API routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/recipes', authenticateToken, recipeRoutes);
app.use('/api/user', userRoutes);
app.use('/api/user/kitchen-iq', kitchenIQRoutes);
app.use('/api/coach', authenticateToken, coachRoutes);
app.use('/api/user/affinity', affinityRoutes);
// ROADMAP 4.0 B3 — surface event sink (impression/tap/cook/rate per surface)
app.use('/api/telemetry/surface-events', authenticateToken, surfaceEventRoutes);
// ROADMAP 4.0 C7 — daily check-in
app.use('/api/daily-check-in', authenticateToken, dailyCheckInRoutes);
// ROADMAP 4.0 C9 — weekly recap card
app.use('/api/recap', authenticateToken, weeklyRecapRoutes);
// ROADMAP 4.0 C10 — cultural primer (first-cook detection + primer content)
app.use('/api/cultural-primer', authenticateToken, culturalPrimerRoutes);
// ROADMAP 4.0 F8 — drink pairing footer
app.use('/api/drink-pairing', authenticateToken, drinkPairingRoutes);
// ROADMAP 4.0 F9 — cohort social proof
app.use('/api/cohort-social-proof', authenticateToken, cohortSocialProofRoutes);
// ROADMAP 4.0 J7 — Sazon daily quip
app.use('/api/quips', authenticateToken, quipsRoutes);
// ROADMAP 4.0 J2 — first-cook-of-cuisine stats
app.use('/api/first-cook-stats', authenticateToken, firstCookStatsRoutes);
app.use('/api/health-metrics', authenticateToken, healthMetricsRoutes);
app.use('/api/weight-goal', authenticateToken, weightGoalRoutes);
app.use('/api/meal-plan', authenticateToken, mealPlanRoutes);
app.use('/api/daily-suggestions', authenticateToken, dailySuggestionsRoutes);
app.use('/api/meal-history', authenticateToken, mealHistoryRoutes);
app.use('/api/meal-prep', authenticateToken, mealPrepRoutes);
app.use('/api/ai-recipes', authenticateToken, aiRecipeRoutes);
app.use('/api/scanner', authenticateToken, scannerRoutes);
app.use('/api/food', authenticateToken, foodRoutes);
// shoppingListShareRoutes has a public GET /import/:token; auth is applied
// inside the router on the share-creation route only.
app.use('/api/shopping-lists', shoppingListShareRoutes);
app.use('/api/shopping-lists', authenticateToken, shoppingListRoutes);
app.use('/api/shopping-apps', authenticateToken, shoppingAppRoutes);
app.use('/api/cost-tracking', authenticateToken, costTrackingRoutes);
app.use('/api/ingredient-availability', authenticateToken, ingredientAvailabilityRoutes);
app.use('/api/pantry', authenticateToken, pantryRoutes);
app.use('/api/meal-components', mealComponentRoutes);
app.use('/api/composed-plates', composedPlateRoutes);
app.use('/api/leftover-inventory', leftoverInventoryRoutes);
app.use('/api/shared-plates', sharedPlateRoutes);
app.use('/api/nutrient-gap', nutrientGapRoutes);
app.use('/api/household', householdRoutes);
app.use('/api/upload', authenticateToken, uploadRoutes);
app.use('/api/search', authenticateToken, searchRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/webhooks/revenuecat', revenuecatRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/follows', followsRoutes);

// ─── Error handlers ──────────────────────────────────────────────────────────

// 404
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl, method: req.method });
});

// Sentry v8+: setupExpressErrorHandler adds a Sentry error handler before the generic one
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// Generic error handler
app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err: error }, 'http.unhandled_error');

  if (error.name === 'UnauthenticatedError') {
    return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
  }
  if (error.code?.startsWith('P')) {
    return res.status(400).json({ error: 'Database error', message: 'An error occurred while processing your request' });
  }
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token', message: 'Please provide a valid authentication token' });
  }
  if (error.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation failed', details: error.details });
  }

  // ERR-1: error.message from Prisma can leak constraint names and column
  // names ("Unique constraint failed on the fields: (`userId_email`)").
  // Only surface error.message when the error sets a 4xx status and is
  // therefore client-actionable; everything else gets a generic message.
  const statusCode = error.status || error.statusCode || 500;
  const isClientError = statusCode >= 400 && statusCode < 500;
  const safeMessage = isClientError
    ? error.message || 'Bad request'
    : 'Internal server error';
  res.status(statusCode).json({
    error: safeMessage,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
});

export { app };
