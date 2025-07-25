import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Support comma-separated list for CORS
const frontendUrls = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(url => url.trim())
  .filter(Boolean);

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',

  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'brk_competition',
    ssl: process.env.DB_SSL === 'true',
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  // Brevo (Email) configuration
  brevo: {
    apiKey: process.env.BREVO_API_KEY || '',
    senderEmail: process.env.BREVO_SENDER_EMAIL || 'no-reply@example.com',
    senderName: process.env.BREVO_SENDER_NAME || 'BRK Competition',
  },

  // Google OAuth configuration
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI ||
      'http://localhost:3000/api/auth/google/callback',
  },

  // Frontend URLs for CORS and redirects
  frontendUrl: frontendUrls[0], // for redirects
  frontendUrls, // for CORS
  passwordResetPath: process.env.PASSWORD_RESET_PATH || '/reset-password',
  emailConfirmationPath:
    process.env.EMAIL_CONFIRMATION_PATH || '/confirm-email',

  // Cookie configuration
  cookie: {
    domain: process.env.COOKIE_DOMAIN || 'localhost',
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: process.env.COOKIE_SAMESITE || 'lax',
  },
};

export default config;
