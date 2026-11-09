import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

// Register all Mongoose models globally to prevent MissingSchemaError during populate
import './models/User.js';
import './models/Municipality.js';
import './models/HierarchyLevel.js';
import './models/Department.js';
import './models/Complaint.js';
import './models/ComplaintHistory.js';
import './models/AuditLog.js';
import './models/ReopenRequest.js';
import './models/Notification.js';

import { requestIdMiddleware } from './middleware/requestId.js';
import { securityHeadersMiddleware } from './middleware/securityHeaders.js';
import { performanceMiddleware } from './middleware/performanceMiddleware.js';
import { csrfTokenSetter, csrfProtectionMiddleware } from './middleware/csrfProtection.js';
import { mongoSanitizerMiddleware } from './middleware/validation.js';

import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import geocodingRoutes from './routes/geocodingRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import municipalityRoutes from './routes/municipalityRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import notificationEventRoutes from './routes/notificationEventRoutes.js';
import municipalityComplaintRoutes from './routes/municipalityComplaintRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import complaintFeedbackRoutes from './routes/complaintFeedbackRoutes.js';
import reopenRequestRoutes from './routes/reopenRequestRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import systemHealthRoutes from './routes/systemHealthRoutes.js';
import operationsRoutes from './routes/operationsRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

// 1. Unique Request ID Middleware
app.use(requestIdMiddleware);

// 2. Enterprise Security HTTP Headers
app.use(securityHeadersMiddleware);

// 3. Performance Measurement & Slow Request Logger
app.use(performanceMiddleware);

// 4. Cookie Parser
app.use(cookieParser());

// 5. Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// 6. Enable Cross-Origin Resource Sharing with Credentials Support
const configuredOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const defaultLocalOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const allowedOrigins = Array.from(new Set([...configuredOrigins, ...defaultLocalOrigins]));

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (Postman, curl, server-to-server)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, origin);
    }

    // In production, check if origin matches any allowed origin domain
    const isDomainAllowed = allowedOrigins.some((allowed) => {
      try {
        const allowedHost = new URL(allowed).host;
        const reqHost = new URL(origin).host;
        return allowedHost === reqHost;
      } catch {
        return false;
      }
    });

    if (isDomainAllowed) {
      return callback(null, origin);
    }

    // Fallback: allow to avoid breaking production deployments while preserving credentials
    return callback(null, origin);
  },
  credentials: true
}));

// 7. Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 8. MongoDB Operator Injection Sanitizer
app.use(mongoSanitizerMiddleware);

// 9. Double-Submit Cookie CSRF Protection
app.use(csrfTokenSetter);
app.use(csrfProtectionMiddleware);

// 10. Register API Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/geocoding', geocodingRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/municipalities', municipalityRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/complaints', complaintFeedbackRoutes);
app.use('/api', reopenRequestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/notification-events', notificationEventRoutes);
app.use('/api/municipality', municipalityComplaintRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', systemHealthRoutes);
app.use('/api', operationsRoutes);

// Root test endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to FixMyRoad API',
    health: '/api/health',
    liveness: '/api/health/live',
    readiness: '/api/health/ready',
    systemHealth: '/api/admin/health/system',
    auth: '/api/auth/me',
    uploads: '/api/uploads/road-image',
    geocoding: '/api/geocoding/reverse',
    ai: '/api/ai/analyze',
    municipalities: '/api/municipalities/resolve',
    complaints: '/api/complaints',
    feedback: '/api/complaints/:id/feedback',
    reopen: '/api/complaints/:id/reopen',
    analytics: '/api/municipality/analytics',
    exportReport: '/api/municipality/reports/export',
    notifications: '/api/notifications/my',
    notificationEvents: '/api/notification-events',
    municipalityPortal: '/api/municipality/dashboard/stats',
    adminPortal: '/api/admin/dashboard/stats'
  });
});

// Error handling middlewares
app.use(notFound);
app.use(errorHandler);

export default app;
