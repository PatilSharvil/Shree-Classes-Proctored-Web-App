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
const uploadRoutes = require('./modules/upload/upload.routes');

const app = express();

// Trust proxy headers (required for Render, Vercel, and other cloud platforms)
// This allows express-rate-limit to correctly identify users behind reverse proxies
app.set('trust proxy', true);

// ============================================
// CORS Configuration - MUST BE FIRST
// This ensures CORS headers are set on ALL responses
// ============================================
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

console.log('[CORS] Allowed origins:', allowedOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('[CORS] Allowing request with no origin');
      return callback(null, true);
    }

    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.indexOf(origin) !== -1;
    
    // Allow common deployment platforms
    const isVercel = origin.includes('.vercel.app');
    const isNetlify = origin.includes('.netlify.app');
    const isRender = origin.includes('.onrender.com');
    const isCustomDomain = origin.includes('shreescienceacademy.com');

    if (isAllowed || isVercel || isNetlify || isRender || isCustomDomain) {
      console.log('[CORS] Allowing origin:', origin);
      callback(null, true);
    } else {
      console.error('[CORS] Blocking origin:', origin);
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

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

// ============================================
// Security middleware (Helmet) - AFTER CORS
// Configure Helmet to not interfere with CORS
// ============================================
app.use(helmet({
  crossOriginOpenerPolicy: false, // Disable to allow cross-origin
  crossOriginResourcePolicy: false, // Disable to allow cross-origin
}));
app.use(cookieParser());

// ============================================
// Body parser middleware (MUST come before CSRF protection)
// ============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// CSRF Protection Middleware
// ============================================
const csrfProtection = (req, res, next) => {
  // Skip CSRF for login endpoint (no session yet)
  if (req.path === '/auth/login' && req.method === 'POST') {
    return next();
  }

  // Check if client sent a CSRF token in header
  const clientToken = req.headers['x-csrf-token'] || req.body?._csrf;
  
  // Check cookie for CSRF token
  const cookieToken = req.cookies?.csrf_token;

  // If we have a client token but no cookie token, trust the client token
  // This handles the case where Cloudflare strips cookies
  if (clientToken && !cookieToken) {
    req.csrfToken = clientToken;
    // Set it as cookie for future requests
    res.cookie('csrf_token', clientToken, {
      httpOnly: false,
      secure: env.nodeEnv === 'production',
      sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });
    console.log('[CSRF] Using client-provided token (cookie was missing)');
    return next();
  }

  // Generate CSRF token if not present
  if (!cookieToken) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf_token', token, {
      httpOnly: false,
      secure: env.nodeEnv === 'production',
      sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });
    req.csrfToken = token;
    res.setHeader('X-CSRF-Token', token);
    console.log('[CSRF] Generated new CSRF token:', token.substring(0, 10) + '...');
  } else {
    req.csrfToken = cookieToken;
  }

  // Verify CSRF token for state-changing requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    console.log('[CSRF] Verification attempt:', {
      path: req.path,
      method: req.method,
      hasCookieToken: !!cookieToken,
      hasClientToken: !!clientToken,
      tokensMatch: clientToken === req.csrfToken
    });

    if (!clientToken || clientToken !== req.csrfToken) {
      console.error('[CSRF] Token validation failed!', {
        clientToken: clientToken ? clientToken.substring(0, 10) + '...' : 'MISSING',
        serverToken: req.csrfToken ? req.csrfToken.substring(0, 10) + '...' : 'MISSING'
      });
      
      return res.status(403).json({
        success: false,
        message: 'CSRF token missing or invalid. Please refresh the page and try again.'
      });
    }
  }

  next();
};

// Apply CSRF protection to all API routes
app.use('/api', csrfProtection);

// ============================================
// Rate limiting
// ============================================
const isDev = env.nodeEnv === 'development';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 10000 : 300, // limit each IP to 300 requests in prod, 10000 in dev
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in development mode
  skip: () => isDev,
  validate: { trustProxy: false }, // Disable trust proxy validation (we trust our reverse proxy)
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
  skip: () => isDev, // Skip in development
  validate: { trustProxy: false }, // Disable trust proxy validation (we trust our reverse proxy)
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
app.use('/api/upload', uploadRoutes);

// Configure static file serving for uploaded files
// Allow access to the /data/uploads directory under /uploads
const uploadsDir = path.join(__dirname, '../../data/uploads');
if (!require('fs').existsSync(uploadsDir)) {
  require('fs').mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

module.exports = app;
