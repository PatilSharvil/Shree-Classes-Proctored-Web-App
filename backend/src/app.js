const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');

const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');
const logger = require('./utils/logger');
const env = require('./config/env');

// Import routes
const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const examsRoutes = require('./modules/exams/exams.routes');
const questionsRoutes = require('./modules/questions/questions.routes');
const attemptsRoutes = require('./modules/attempts/attempts.routes');
const proctoringRoutes = require('./modules/proctoring/proctoring.routes');

const app = express();

// Security middleware
app.use(helmet());
app.use(cookieParser());

// Body parser middleware (MUST come before CSRF protection)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser middleware (now using cookie-parser package)
// CSRF Protection Middleware
const csrfProtection = (req, res, next) => {
  // Skip CSRF for login endpoint (no session yet)
  if (req.path === '/auth/login' && req.method === 'POST') {
    return next();
  }

  // Generate CSRF token if not present
  if (!req.cookies || !req.cookies.csrf_token) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf_token', token, {
      httpOnly: false, // Accessible by JavaScript
      secure: env.nodeEnv === 'production', // HTTPS only in production
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    req.csrfToken = token;
  } else {
    req.csrfToken = req.cookies.csrf_token;
  }

  // Verify CSRF token for state-changing requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const clientToken = req.headers['x-csrf-token'] || req.body?._csrf;

    if (!clientToken || clientToken !== req.csrfToken) {
      return res.status(403).json({
        success: false,
        message: 'CSRF token missing or invalid'
      });
    }
  }

  next();
};

// Apply CSRF protection to all API routes
app.use('/api', csrfProtection);

// CORS configuration - Production Ready
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.netlify.app') ||
        origin.endsWith('shreescienceacademy.com')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-CSRF-Token'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Rate limiting - less strict in development to prevent 429 errors while testing
const isDev = env.nodeEnv === 'development';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 5000 : 300, // limit each IP to 300 requests in prod, 5000 in dev
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 1000 : 5, // limit each IP to 5 login attempts in prod, 1000 in dev
  message: 'Too many login attempts from this IP, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed requests
});
app.use('/api/auth/login', authLimiter);

// Health check endpoint (for Render health monitoring)
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv
  });
});

// Keep-alive endpoint (for cron jobs / uptime monitors)
// Lightweight endpoint that can be pinged by external services to prevent sleep
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

app.get('/keep-alive', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api', questionsRoutes);
app.use('/api/attempts', attemptsRoutes);
app.use('/api/proctoring', proctoringRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

module.exports = app;
