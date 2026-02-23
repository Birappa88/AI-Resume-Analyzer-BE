import 'dotenv/config';
import app from './app.js';
import connectDB from './config/database.js';
import logger from './utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure required directories exist at startup
['uploads', 'logs'].forEach((dir) => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    logger.info(`🚀  AI Resume Analyzer API`);
    logger.info(`    Environment : ${process.env.NODE_ENV}`);
    logger.info(`    Port        : ${PORT}`);
    logger.info(`    Health      : http://localhost:${PORT}/api/health`);
    logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  });

  // ─── Graceful Shutdown ──────────────────────────────────────────────────────────
  const shutdown = async (signal) => {
    logger.warn(`${signal} received — shutting down gracefully...`);
    server.close(async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed. Server terminated.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled Rejection: ${reason}`);
    server.close(() => process.exit(1));
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.message}\n${err.stack}`);
    process.exit(1);
  });
};

startServer();
