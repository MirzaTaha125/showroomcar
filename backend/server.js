import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import multer from 'multer';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import { validateEnv } from './utils/validateEnv.js';
import { setupGracefulShutdown } from './utils/gracefulShutdown.js';
import { requestLogger, errorLogger } from './middleware/logger.js';
import { sanitizeBody, sanitizeQuery, authLimiter } from './middleware/security.js';
import { protect, adminOnly } from './middleware/auth.js';

/** Return 503 if DB is not connected (avoids 500s from failed queries). */
function requireDb(req, res, next) {
  if (mongoose.connection.readyState === 1) return next();
  res.status(503).json({ message: 'Database not ready. Please try again in a moment.' });
}
import authRoutes from './routes/auth.js';
import showroomRoutes from './routes/showrooms.js';
import userRoutes from './routes/users.js';
import vehicleRoutes from './routes/vehicles.js';
import transactionRoutes from './routes/transactions.js';
import carAccountRoutes from './routes/carAccounts.js';
import pdfRoutes from './routes/pdf.js';
import verifyRoutes from './routes/verify.js';
import statsRoutes from './routes/stats.js';
import activityLogRoutes from './routes/activityLogs.js';

// Validate environment variables
validateEnv();

// Catch async rejections so they don't cause 500s with no response (Express 4 doesn't catch them)
process.on('unhandledRejection', (reason, promise) => {
  console.error('[unhandledRejection]', reason);
});

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
  crossOriginEmbedderPolicy: false,
}));

// CORS - support multiple origins from env variable
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(origin => origin.trim())
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Compression
app.use(compression());

// Body parser with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use(requestLogger);
}

// Input sanitization
app.use(sanitizeBody);
app.use(sanitizeQuery);

// Serve uploaded files (e.g. showroom logos)
app.use('/api/uploads', express.static('uploads'));

// Logo upload: register at app level so it's always matched (avoids 404 with proxy)
const uploadsDir = path.join(process.cwd(), 'uploads', 'logos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safe = `${Date.now()}-${(file.originalname || 'logo').replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    cb(null, safe);
  },
});
const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /^image\/(jpeg|jpg|png|gif|webp|pjpeg|x-png)$/i;
    if (file.mimetype && allowed.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only images (JPEG, PNG, GIF, WebP) are allowed.'));
  },
}).single('logo');

app.post('/api/showrooms/upload-logo', protect, adminOnly, (req, res) => {
  uploadLogo(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Logo load failed.' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
    res.json({ logoPath: `/api/uploads/logos/${req.file.filename}` });
  });
});

// Biometric upload: setup directory and multer for biometric impressions
const biometricsDir = path.join(process.cwd(), 'uploads', 'biometrics');
if (!fs.existsSync(biometricsDir)) {
  fs.mkdirSync(biometricsDir, { recursive: true });
}
const biometricStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, biometricsDir),
  filename: (req, file, cb) => {
    const safe = `${Date.now()}-${(file.originalname || 'biometric').replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    cb(null, safe);
  },
});
const uploadBiometric = multer({
  storage: biometricStorage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /^image\/(jpeg|jpg|png|gif|webp)$/i;
    if (file.mimetype && allowed.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only images (JPEG, PNG, GIF, WebP) are allowed.'));
  },
}).single('biometric');

app.post('/api/car-accounts/upload-biometric', protect, (req, res) => {
  uploadBiometric(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Biometric upload failed.' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
    res.json({ biometricImagePath: `/api/uploads/biometrics/${req.file.filename}` });
  });
});

// Apply rate limiting to auth routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/showrooms', requireDb, showroomRoutes);
app.use('/api/users', requireDb, userRoutes);
app.use('/api/vehicles', requireDb, vehicleRoutes);
app.use('/api/transactions', requireDb, transactionRoutes);
app.use('/api/car-accounts', requireDb, carAccountRoutes);
app.use('/api/pdf', requireDb, pdfRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/verify-sale', verifyRoutes);
app.use('/api/stats', requireDb, statsRoutes);
app.use('/api/activity-logs', requireDb, activityLogRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ message: 'Endpoint not found' }));

// Error logging
app.use(errorLogger);

// Global error handler (always log 500s so we can fix root cause)
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const statusCode = err.statusCode || 500;
  const is5xx = statusCode >= 500;

  // Log request context for 5xx errors
  if (is5xx) {
    console.error(`\x1b[31m[500 ERROR]\x1b[0m ${req.method} ${req.originalUrl}`);
    console.error('Body snippet:', JSON.stringify(req.body || {}).slice(0, 200));
    console.error(err.stack || err.message);
  }

  const message = is5xx && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : (err.message || 'Internal server error');
  const response = {
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
});

const PORT = process.env.PORT || 5000;

// Connect to database, then start server (avoids 500s from requests before DB is ready)
async function start() {
  await connectDB();
  const server = app.listen(PORT, () => {
    console.log(`\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`);
    console.log(`\x1b[32m✓\x1b[0m Server:      \x1b[36mhttp://localhost:${PORT}\x1b[0m`);
    console.log(`\x1b[32m✓\x1b[0m Environment: \x1b[36m${process.env.NODE_ENV || 'development'}\x1b[0m`);
    console.log(`\x1b[32m✓\x1b[0m Database:    \x1b[32mCONNECTED\x1b[0m`);
    console.log(`\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`);
  });
  setupGracefulShutdown(server);
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
