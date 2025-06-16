import { createClient, RedisClientType } from 'redis';
import { redisConfig } from '../config/redis.config';

export class RedisService {
  private static instance: RedisService;
  private client: RedisClientType | null = null;
  private connectionPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise<void>(async (resolve, reject) => {
      try {
        // Create Redis client
        const clientOptions: any = {
          socket: {
            host: redisConfig.host,
            port: redisConfig.port,
          },
          database: redisConfig.db,
        };

        // Add password if provided
        if (redisConfig.password) {
          clientOptions.password = redisConfig.password;
        }

        this.client = createClient(clientOptions);

        // Handle connection events
        this.client.on('error', (err) => {
          console.error('Redis Client Error:', err);
        });

        this.client.on('connect', () => {
          console.log('Connected to Redis');
        });

        this.client.on('ready', () => {
          console.log('Redis client ready');
        });

        // Connect to Redis
        await this.client.connect();
        
        console.log('Successfully connected to Redis');
        resolve();
      } catch (error) {
        console.error('Failed to connect to Redis:', error);
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  async publishMessage(message: any): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      // Publish message to Redis channel
      const messageString = JSON.stringify(message);
      await this.client.publish(redisConfig.channelName, messageString);

      return true;
    } catch (error) {
      console.error('Error publishing message to Redis:', error);
      return false;
    }
  }

  async setData(key: string, value: any, expireInSeconds?: number): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      const valueString = typeof value === 'string' ? value : JSON.stringify(value);
      
      if (expireInSeconds) {
        await this.client.setEx(key, expireInSeconds, valueString);
      } else {
        await this.client.set(key, valueString);
      }

      return true;
    } catch (error) {
      console.error('Error setting data in Redis:', error);
      return false;
    }
  }

  async getData(key: string): Promise<any | null> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      const value = await this.client.get(key);
      
      if (!value) {
        return null;
      }

      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.error('Error getting data from Redis:', error);
      return null;
    }
  }

  async deleteData(key: string): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Error deleting data from Redis:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.client && this.client.isOpen) {
        await this.client.quit();
        this.client = null;
      }
      
      this.connectionPromise = null;
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }

  async subscribeToChannel(channelName: string, callback: (message: any) => void): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      // Create a duplicate client for subscribing (Redis requirement)
      const subscriber = this.client.duplicate();
      await subscriber.connect();

      subscriber.subscribe(channelName, (message) => {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch (error) {
          console.error('Error parsing Redis message:', error);
        }
      });

      console.log(`Subscribed to Redis channel: ${channelName}`);
      return true;
    } catch (error) {
      console.error('Error subscribing to Redis channel:', error);
      return false;
    }
  }

  // Championship-specific cache methods
  async cacheChampionshipBasicInfo(championshipId: string, data: any): Promise<boolean> {
    try {
      const key = `championship:${championshipId}`;
      // Cache championship info without expiration (permanent until explicitly removed)
      return await this.setData(key, data);
    } catch (error) {
      console.error('Error caching championship basic info:', error);
      return false;
    }
  }

  async getCachedChampionshipBasicInfo(championshipId: string): Promise<any | null> {
    try {
      const key = `championship:${championshipId}`;
      return await this.getData(key);
    } catch (error) {
      console.error('Error getting cached championship basic info:', error);
      return null;
    }
  }

  async invalidateChampionshipCache(championshipId: string): Promise<boolean> {
    try {
      const key = `championship:${championshipId}`;
      return await this.deleteData(key);
    } catch (error) {
      console.error('Error invalidating championship cache:', error);
      return false;
    }
  }

  // Season-specific cache methods with championship relationship
  async cacheSeasonBasicInfo(seasonId: string, data: any): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      // Cache season data
      const seasonKey = `season:${seasonId}`;
      const setResult = await this.setData(seasonKey, data);

      if (setResult && data.championshipId) {
        // Add season ID to championship's seasons list for fast lookup
        const championshipSeasonsKey = `championship:${data.championshipId}:seasons`;
        await this.client.sAdd(championshipSeasonsKey, seasonId);
      }

      return setResult;
    } catch (error) {
      console.error('Error caching season basic info:', error);
      return false;
    }
  }

  async getCachedSeasonBasicInfo(seasonId: string): Promise<any | null> {
    try {
      const key = `season:${seasonId}`;
      return await this.getData(key);
    } catch (error) {
      console.error('Error getting cached season basic info:', error);
      return null;
    }
  }

  async invalidateSeasonCache(seasonId: string, championshipId?: string): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      // Remove season data
      const seasonKey = `season:${seasonId}`;
      const deleteResult = await this.deleteData(seasonKey);

      // Remove season ID from championship's seasons list if championshipId is provided
      if (championshipId) {
        const championshipSeasonsKey = `championship:${championshipId}:seasons`;
        await this.client.sRem(championshipSeasonsKey, seasonId);
      }

      return deleteResult;
    } catch (error) {
      console.error('Error invalidating season cache:', error);
      return false;
    }
  }

  // Get all season IDs for a championship (for fast bulk retrieval)
  async getChampionshipSeasonIds(championshipId: string): Promise<string[]> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      const key = `championship:${championshipId}:seasons`;
      const seasonIds = await this.client.sMembers(key);
      return seasonIds || [];
    } catch (error) {
      console.error('Error getting championship season IDs:', error);
      return [];
    }
  }

  // Clean up championship seasons index when championship is deleted
  async invalidateChampionshipSeasonsIndex(championshipId: string): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      const key = `championship:${championshipId}:seasons`;
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Error invalidating championship seasons index:', error);
      return false;
    }
  }
} 