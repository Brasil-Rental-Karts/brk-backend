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

  // Championship-specific cache methods with optimized performance
  async cacheChampionshipBasicInfo(championshipId: string, data: any): Promise<boolean> {
    try {
      const key = `championship:${championshipId}`;
      // Cache championship basic info for 1 hour (3600 seconds)
      return await this.setData(key, data, 3600);
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

  // Batch operations for better performance
  async getMultipleCachedChampionships(championshipIds: string[]): Promise<{ [key: string]: any }> {
    const results: { [key: string]: any } = {};
    
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      // Use pipeline for batch operations
      const pipeline = this.client.multi();
      
      championshipIds.forEach(id => {
        const key = `championship:${id}`;
        pipeline.get(key);
      });

      const responses = await pipeline.exec();
      
      if (responses) {
        responses.forEach((response, index) => {
          const championshipId = championshipIds[index];
          if (response && typeof response === 'string') {
            try {
              results[championshipId] = JSON.parse(response);
            } catch {
              results[championshipId] = response;
            }
          }
        });
      }
    } catch (error) {
      console.error('Error getting multiple cached championships:', error);
    }

    return results;
  }

  async cacheMultipleChampionships(championshipsData: { [key: string]: any }): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      // Use pipeline for batch operations
      const pipeline = this.client.multi();
      
      Object.entries(championshipsData).forEach(([championshipId, data]) => {
        const key = `championship:${championshipId}`;
        const valueString = JSON.stringify(data);
        pipeline.setEx(key, 3600, valueString); // 1 hour expiration
      });

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Error caching multiple championships:', error);
      return false;
    }
  }
} 