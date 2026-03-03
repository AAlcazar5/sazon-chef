import 'dotenv/config';
import { app } from './app';
import { initializeAutoBackup } from './utils/autoBackup';
import { prisma } from '@/lib/prisma';
import { startNotificationScheduler, stopNotificationScheduler } from './services/notificationScheduler';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  
  try {
    // Stop notification scheduler
    stopNotificationScheduler();

    // Close the Express server
    server.close(() => {
      console.log('HTTP server closed.');
    });
    
    // Disconnect Prisma client
    await prisma.$disconnect();
    console.log('Database disconnected.');
    
    console.log('Graceful shutdown completed.');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle different shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server
const server = app.listen(PORT, HOST, async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Initialize automatic recipe backups
    await initializeAutoBackup();

    // Start notification scheduler (hourly trigger checks)
    if (process.env.NODE_ENV !== 'test') {
      startNotificationScheduler();
    }

    console.log(`🚀 Sazon Chef API server running on http://${HOST}:${PORT}`);
    console.log(`📊 Health check available at http://${HOST}:${PORT}/health`);
    console.log(`🍳 Recipes API available at http://${HOST}:${PORT}/api/recipes`);
    console.log(`👤 User API available at http://${HOST}:${PORT}/api/user`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
});

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});

export { server };