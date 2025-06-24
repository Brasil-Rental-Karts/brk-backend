import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { redisConfig } from '../config/redis.config';

/**
 * Represents a database change event
 */
export interface DatabaseChangeEvent {
  eventId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  data: any;
  timestamp: string;
}

/**
 * RedisService - New Architecture
 * 
 * Purpose: Redis is used EXCLUSIVELY for database change events.
 * - Publishes database change events to Redis channels
 * - Stores temporary session data (refresh tokens)
 * - Does NOT store or retrieve business data (all business data comes from PostgreSQL)
 * 
 * Usage Rules:
 * 1. Use publishDatabaseChangeEvent() to notify other applications of data changes
 * 2. Use session methods for temporary data like tokens
 * 3. NEVER read business data from Redis - always use PostgreSQL
 */
export class RedisService {
  private static instance: RedisService;
  private client: Redis | null = null;
  private isConnected: boolean = false;

  private constructor() {}

  static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  async connect(): Promise<void> {
    if (this.isConnected && this.client?.status === 'ready') {
      return;
    }

    try {
      const redisOptions: any = {
        host: redisConfig.host,
        port: redisConfig.port,
        db: redisConfig.db,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      };

      // Add password if it exists
      if (redisConfig.password) {
        redisOptions.password = redisConfig.password;
      }

      this.client = new Redis(redisOptions);

      await this.client.connect();
      this.isConnected = true;
      console.log('✅ Connected to Redis for database events');
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      console.log('✅ Disconnected from Redis');
    }
  }

  /**
   * Publishes a database change event to Redis channel
   * This is the primary purpose of Redis in our new architecture
   */
  async publishDatabaseChangeEvent(operation: 'INSERT' | 'UPDATE' | 'DELETE', table: string, data: any): Promise<void> {
    if (!this.isConnected || !this.client) {
      console.warn(`⚠️ Redis not connected, skipping event publication for ${table}`);
      return;
    }

    try {
      const event: DatabaseChangeEvent = {
        eventId: uuidv4(),
        operation,
        table,
        data,
        timestamp: new Date().toISOString()
      };

      const eventKey = `event:${event.eventId}`;
      const eventData = JSON.stringify(event);

      // Store the event with TTL (24 hours) using eventStorage config
      await this.client.setex(eventKey, redisConfig.eventStorage.defaultTTL, eventData);

      // Publish to the events channel
      await this.client.publish(redisConfig.channelName, eventData);

      console.log(`📡 Published ${operation} event for ${table} (ID: ${event.eventId})`);
    } catch (error) {
      console.error(`❌ Failed to publish database change event for ${table}:`, error);
    }
  }

  /**
   * DEPRECATED: This method is kept for backward compatibility but should not be used
   * All data retrieval should come from PostgreSQL
   */
  async storeChangeEventData(key: string, data: any, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected || !this.client) {
      console.warn('⚠️ Redis not connected, skipping data storage');
      return;
    }

    try {
      const dataToStore = typeof data === 'string' ? data : JSON.stringify(data);
      
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, dataToStore);
      } else {
        await this.client.set(key, dataToStore);
      }
    } catch (error) {
      console.error(`❌ Failed to store data in Redis for key ${key}:`, error);
    }
  }

  /**
   * DEPRECATED: This method is kept for backward compatibility but should not be used
   * All data retrieval should come from PostgreSQL
   */
  async removeChangeEventData(key: string): Promise<void> {
    if (!this.isConnected || !this.client) {
      console.warn('⚠️ Redis not connected, skipping data removal');
      return;
    }

    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`❌ Failed to remove data from Redis for key ${key}:`, error);
    }
  }

  // =========================
  // SESSION DATA METHODS
  // =========================
  // These methods are for session data like refresh tokens
  // Session data is different from business data and is appropriate for Redis

  /**
   * Store session data (like refresh tokens) in Redis
   * This is appropriate use of Redis for temporary session data
   */
  async storeSessionData(key: string, data: string, ttlSeconds: number): Promise<void> {
    if (!this.isConnected || !this.client) {
      console.warn('⚠️ Redis not connected, skipping session data storage');
      return;
    }

    try {
      await this.client.setex(key, ttlSeconds, data);
      console.log(`🔑 Stored session data for key: ${key}`);
    } catch (error) {
      console.error(`❌ Failed to store session data for key ${key}:`, error);
    }
  }

  /**
   * Retrieve session data from Redis
   * This is appropriate for session data like refresh tokens
   */
  async getSessionData(key: string): Promise<string | null> {
    if (!this.isConnected || !this.client) {
      console.warn('⚠️ Redis not connected, cannot retrieve session data');
      return null;
    }

    try {
      const data = await this.client.get(key);
      return data;
    } catch (error) {
      console.error(`❌ Failed to get session data for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove session data from Redis
   * This is appropriate for session cleanup like logout
   */
  async removeSessionData(key: string): Promise<void> {
    if (!this.isConnected || !this.client) {
      console.warn('⚠️ Redis not connected, skipping session data removal');
      return;
    }

    try {
      await this.client.del(key);
      console.log(`🗑️ Removed session data for key: ${key}`);
    } catch (error) {
      console.error(`❌ Failed to remove session data for key ${key}:`, error);
    }
  }

  /**
   * Health check method
   */
  async ping(): Promise<boolean> {
    if (!this.client) return false;
    
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get connection status
   */
  isRedisConnected(): boolean {
    return this.isConnected && this.client?.status === 'ready';
  }
} 