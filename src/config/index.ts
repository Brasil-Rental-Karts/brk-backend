import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'brk-backend',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '2d',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
};

export default config;
