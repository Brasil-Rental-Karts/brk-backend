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
  connectTimeoutMS: 10000,
  // Only use synchronize in development, never in production
  synchronize: false,
  logging: false,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  // Configure migrations
  migrationsRun: process.env.NODE_ENV === 'production', // Auto-run migrations in production
};

// Create and export the data source
export const AppDataSource = new DataSource(dbConfig);
