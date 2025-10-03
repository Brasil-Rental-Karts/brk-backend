import dotenv from 'dotenv';
import { join } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';

// Load environment variables
dotenv.config();

// Database configuration
export const dbConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'brk_competition',
  entities: [join(__dirname, '../models/**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, '../migrations/**/*{.ts,.js}')],
  // In development mode, retry connecting to database in case it's not ready yet
  // This is useful when starting with Docker Compose
  connectTimeoutMS: 60000,
  // Only use synchronize in development, never in production
  synchronize: false,
  logging: false,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  // Configure migrations
  migrationsRun: process.env.NODE_ENV === 'production', // Auto-run migrations in production
  
  // Connection pooling configuration for Aiven free tier
  extra: {
    // Maximum number of connections in the pool
    max: 5, // Reduced for Aiven free tier
    // Minimum number of connections in the pool
    min: 1,
    // Maximum time a client is allowed to remain idle in the pool
    idleTimeoutMillis: 30000,
    // Maximum time to wait for a connection to be available
    acquireTimeoutMillis: 60000,
    // Maximum time a connection can be used before being closed
    maxLifetime: 300000, // 5 minutes
    // Enable connection pooling
    pool: {
      // Maximum number of connections in the pool
      max: 5,
      // Minimum number of connections in the pool
      min: 1,
      // Maximum time a client is allowed to remain idle in the pool
      idle: 30000,
      // Maximum time to wait for a connection to be available
      acquire: 60000,
      // Maximum time a connection can be used before being closed
      evict: 300000,
    },
  },
};

// Create and export the data source
export const AppDataSource = new DataSource(dbConfig);
