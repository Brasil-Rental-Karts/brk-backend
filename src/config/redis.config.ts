import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD && process.env.REDIS_PASSWORD.trim() !== '' ? process.env.REDIS_PASSWORD : undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  // List of tables to track changes
  trackedTables: ['Clubs'], // We'll start with Clubs table but can expand later
  // Channel name for database events
  channelName: 'database_events'
}; 