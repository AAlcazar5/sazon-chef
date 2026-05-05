import 'dotenv/config';
import { app } from './app';
import { initializeAutoBackup } from './utils/autoBackup';
import { prisma } from '@/lib/prisma';
import { startNotificationScheduler, stopNotificationScheduler } from './services/notificationScheduler';
import { logger } from './utils/logger';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info(`\nReceived ${signal}. Starting graceful shutdown...`);
  
  try {
    // Stop notification scheduler
    stopNotificationScheduler();

    // Close the Express server
    server.close(() => {
      logger.info('HTTP server closed.');
    });
    
    // Disconnect Prisma client
    await prisma.$disconnect();
    logger.info('Database disconnected.');
    
    logger.info('Graceful shutdown completed.');
    process.exit(0);
  } catch (error) {
    logger.error({ data: error }, 'Error during graceful shutdown:');
    process.exit(1);
  }
};

// Handle different shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error({ data: error }, 'Uncaught Exception:');
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ promise, reason }, 'Unhandled Rejection at:');
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server
const server = app.listen(PORT, HOST, async () => {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
    
    // Initialize automatic recipe backups
    await initializeAutoBackup();

    // Start notification scheduler (hourly trigger checks)
    if (process.env.NODE_ENV !== 'test') {
      startNotificationScheduler();
    }

    logger.info(`🚀 Sazon Chef API server running on http://${HOST}:${PORT}`);
    logger.info(`📊 Health check available at http://${HOST}:${PORT}/health`);
    logger.info(`🍳 Recipes API available at http://${HOST}:${PORT}/api/recipes`);
    logger.info(`👤 User API available at http://${HOST}:${PORT}/api/user`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
  } catch (error) {
    logger.error({ data: error }, '❌ Failed to start server:');
    process.exit(1);
  }
});

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`❌ Port ${PORT} is already in use`);
  } else {
    logger.error({ data: error }, '❌ Server error:');
  }
  process.exit(1);
});

export { server };