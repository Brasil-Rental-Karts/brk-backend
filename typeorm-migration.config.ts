import dotenv from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';

// Load environment variables
dotenv.config();

// Migration configuration for TypeORM
const migrationConfig = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'brk_competition',
  entities: [join(__dirname, './src/models/**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, './src/migrations/**/*{.ts,.js}')],
  synchronize: false, // IMPORTANT: Disable auto synchronization for migrations
  logging: true,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

export default migrationConfig;
