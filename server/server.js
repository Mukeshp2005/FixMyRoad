import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from './src/app.js';
import connectDB from './src/config/database.js';
import { validateProductionConfig, getSafeConfigSummary } from './src/config/productionConfig.js';
import { startNotificationProcessor, stopNotificationProcessor } from './src/services/notification/notificationProcessor.js';
import { startEscalationCron } from './src/services/escalationCron.js';

// Load environment variables
dotenv.config();

// 1. Production Config Validation (Fails safely if secrets missing)
validateProductionConfig();

const safeConfig = getSafeConfigSummary();
console.log('ℹ️ Safe Configuration Summary loaded:', JSON.stringify(safeConfig, null, 2));

const PORT = safeConfig.port;

let activeServer;

const startServer = async () => {
  const connected = await connectDB();
  if (!connected) {
    console.error('❌ Database connection failed. Background processors will not start.');
  }

  // 3. Start Express server
  activeServer = app.listen(PORT, () => {
    console.log(`🚀 FixMyRoad Server running in ${safeConfig.environment} mode on port ${PORT}`);

    if (connected) {
      // Start background notification processor poller
      startNotificationProcessor();
      
      // Start automated SLA escalation engine
      startEscalationCron();
    }
  });
  return activeServer;
};

startServer();

// 4. Graceful Shutdown Handler
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown sequence...`);

  const closeServer = () => new Promise((resolve) => {
    if (activeServer) {
      activeServer.close(resolve);
    } else {
      resolve();
    }
  });

  await closeServer();
  console.log('  ✓ HTTP server closed.');

  // Stop background outbox poller and unlock PROCESSING jobs
  await stopNotificationProcessor();

  // Close MongoDB connection
  try {
    await mongoose.connection.close();
    console.log('  ✓ MongoDB connection closed.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error closing MongoDB connection during shutdown:', err.message);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections gracefully
process.on('unhandledRejection', (err) => {
  console.error('❌ UNHANDLED REJECTION! Shutting down server...', err);
  if (activeServer) {
    activeServer.close(async () => {
      await mongoose.connection.close();
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});
