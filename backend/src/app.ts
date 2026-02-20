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
import shoppingListRoutes from '@modules/shoppingList/shoppingListRoutes';
import shoppingAppRoutes from '@modules/shoppingList/shoppingAppRoutes';
import costTrackingRoutes from '@modules/costTracking/costTrackingRoutes';
import ingredientAvailabilityRoutes from '@modules/ingredientAvailability/ingredientAvailabilityRoutes';
import pantryRoutes from '@modules/pantry/pantryRoutes';
import { authRoutes } from '@modules/auth/authRoutes';
import { apiLimiter } from './middleware/rateLimiter';

// Import types for Express
import type { Request, Response, NextFunction } from 'express';

// Create Express application
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.FRONTEND_URL || 'http://localhost:8081')
    : true, // Allow all origins in development (device/emulator/browser)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-data-sharing-enabled', 'x-analytics-enabled', 'x-location-services-enabled']
}));

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (profile pictures, etc.)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Rate limiting (applied to all routes)
app.use('/api', apiLimiter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/user', userRoutes);
app.use('/api/health-metrics', healthMetricsRoutes);
app.use('/api/weight-goal', weightGoalRoutes);
app.use('/api/meal-plan', mealPlanRoutes);
app.use('/api/daily-suggestions', dailySuggestionsRoutes);
app.use('/api/meal-history', mealHistoryRoutes);
app.use('/api/meal-prep', mealPrepRoutes);
app.use('/api/ai-recipes', aiRecipeRoutes);
app.use('/api/scanner', scannerRoutes);
app.use('/api/shopping-lists', shoppingListRoutes);
app.use('/api/shopping-apps', shoppingAppRoutes);
app.use('/api/cost-tracking', costTrackingRoutes);
app.use('/api/ingredient-availability', ingredientAvailabilityRoutes);
app.use('/api/pantry', pantryRoutes);

// 404 handler for undefined routes
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Global error handler:', error);

  // Prisma errors
  if (error.code?.startsWith('P')) {
    return res.status(400).json({
      error: 'Database error',
      message: 'An error occurred while processing your request'
    });
  }

  // JWT errors (for future auth)
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'Please provide a valid authentication token'
    });
  }

  // Validation errors (for future validation)
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details
    });
  }

  // Default error response
  const statusCode = error.status || error.statusCode || 500;
  const message = error.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error.details
    })
  });
});

export { app };