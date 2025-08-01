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
        this.client.on('error', err => {
          // console.error('Redis Client Error:', err);
        });

        // Connect to Redis
        await this.client.connect();

        resolve();
      } catch (error) {
        // console.error('Failed to connect to Redis:', error);
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
      // console.error('Error publishing message to Redis:', error);
      return false;
    }
  }

  async setData(
    key: string,
    value: any,
    expireInSeconds?: number
  ): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      const valueString =
        typeof value === 'string' ? value : JSON.stringify(value);

      if (expireInSeconds) {
        await this.client.setEx(key, expireInSeconds, valueString);
      } else {
        await this.client.set(key, valueString);
      }

      return true;
    } catch (error) {
      // console.error('Error setting data in Redis:', error);
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
      // console.error('Error getting data from Redis:', error);
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
      // console.error('Error deleting data from Redis:', error);
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
      // console.error('Error closing Redis connection:', error);
    }
  }

  async subscribeToChannel(
    channelName: string,
    callback: (message: any) => void
  ): Promise<boolean> {
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

      subscriber.subscribe(channelName, message => {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch (error) {
          // console.error('Error parsing Redis message:', error);
        }
      });

      return true;
    } catch (error) {
      // console.error('Error subscribing to Redis channel:', error);
      return false;
    }
  }

  // Championship-specific cache methods with Redis Hashes for maximum performance
  async cacheChampionshipBasicInfo(
    championshipId: string,
    data: any
  ): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      // Use Redis Hash to store championship data (more efficient than JSON strings)
      const championshipKey = `championship:${championshipId}`;
      const championshipData = {
        id: data.id,
        name: data.name,
        slug: data.slug || '',
        championshipImage: data.championshipImage || '',
        shortDescription: data.shortDescription || '',
        fullDescription: data.fullDescription || '',
        sponsors: JSON.stringify(data.sponsors || []),
      };

      // Store championship data as Redis Hash
      await this.client.hSet(championshipKey, championshipData);

      // Add to global championships set for bulk operations
      await this.client.sAdd('championships:all', championshipId);

      return true;
    } catch (error) {
      // console.error('Error caching championship basic info:', error);
      return false;
    }
  }

  async getCachedChampionshipBasicInfo(
    championshipId: string
  ): Promise<any | null> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      const key = `championship:${championshipId}`;
      const data = await this.client.hGetAll(key);

      if (Object.keys(data).length === 0) {
        return null;
      }

      return {
        ...data,
        sponsors: JSON.parse(data.sponsors || '[]'),
      };
    } catch (error) {
      // console.error('Error getting cached championship basic info:', error);
      return null;
    }
  }

  // Get multiple championships at once using Redis pipeline (ultra-fast)
  async getMultipleChampionshipsBasicInfo(
    championshipIds: string[]
  ): Promise<any[]> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      if (championshipIds.length === 0) {
        return [];
      }

      // Use Redis pipeline for batch operations
      const pipeline = this.client.multi();

      championshipIds.forEach(id => {
        pipeline.hGetAll(`championship:${id}`);
      });

      const results = await pipeline.exec();

      if (!results) {
        return [];
      }

      // Process results and convert back to proper format
      return results
        .map((result: any) => result[1]) // Get the actual data from pipeline result
        .filter((data: any) => data && Object.keys(data).length > 0)
        .map((data: any) => ({
          id: data.id,
          name: data.name,
          championshipImage: data.championshipImage,
          shortDescription: data.shortDescription,
          fullDescription: data.fullDescription,
          sponsors: (() => {
            try {
              return data.sponsors ? JSON.parse(data.sponsors) : [];
            } catch (e) {
              // console.error('Error parsing sponsors JSON:', e);
              return [];
            }
          })(),
        }));
    } catch (error) {
      // console.error('Error getting multiple championships from cache:', error);
      return [];
    }
  }

  async invalidateChampionshipCache(championshipId: string): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      const key = `championship:${championshipId}`;
      await this.client.del(key);

      // Remove from global championships set
      await this.client.sRem('championships:all', championshipId);

      return true;
    } catch (error) {
      // console.error('Error invalidating championship cache:', error);
      return false;
    }
  }

  // Season-specific cache methods with Redis Hashes for maximum performance
  async cacheSeasonBasicInfo(seasonId: string, data: any): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      // Use Redis Hash to store season data (more efficient than JSON strings)
      const seasonKey = `season:${seasonId}`;
      const seasonData = {
        id: data.id,
        name: data.name,
        slug: data.slug || '',
        startDate:
          data.startDate instanceof Date
            ? data.startDate.toISOString()
            : data.startDate,
        endDate:
          data.endDate instanceof Date
            ? data.endDate.toISOString()
            : data.endDate,
        championshipId: data.championshipId,
        registrationOpen: data.registrationOpen ? 'true' : 'false',
        regulationsEnabled: data.regulationsEnabled ? 'true' : 'false',
      };

      // Store season data as Redis Hash
      await this.client.hSet(seasonKey, seasonData);

      if (data.championshipId) {
        // Add season ID to championship's seasons set for fast lookup
        const championshipSeasonsKey = `championship:${data.championshipId}:seasons`;
        await this.client.sAdd(championshipSeasonsKey, seasonId);
      }

      // Add to global seasons set for bulk operations
      await this.client.sAdd('seasons:all', seasonId);

      return true;
    } catch (error) {
      // console.error('Error caching season basic info:', error);
      return false;
    }
  }

  async getCachedSeasonBasicInfo(seasonId: string): Promise<any | null> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      const key = `season:${seasonId}`;
      const data = await this.client.hGetAll(key);

      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      const seasonData: any = {
        id: data.id,
        name: data.name,
        slug: data.slug || '',
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        championshipId: data.championshipId,
        registrationOpen: data.registrationOpen === 'true',
        regulationsEnabled: data.regulationsEnabled === 'true',
      };

      // Include classification if available
      if (data.classification) {
        try {
          seasonData['classification'] = JSON.parse(data.classification);
        } catch (error) {
          // If classification parsing fails, just ignore it
        }
      }

      return seasonData;
    } catch (error) {
      // console.error('Error getting cached season basic info:', error);
      return null;
    }
  }

  // Get multiple seasons at once using Redis pipeline (ultra-fast)
  async getMultipleSeasonsBasicInfo(seasonIds: string[]): Promise<any[]> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      if (seasonIds.length === 0) {
        return [];
      }

      // Use Redis pipeline for batch operations
      const pipeline = this.client.multi();

      seasonIds.forEach(id => {
        pipeline.hGetAll(`season:${id}`);
      });

      const results = await pipeline.exec();

      if (!results) {
        return [];
      }

      // Process results and convert back to proper format
      return results
        .map((result: any) => result[1]) // Get the actual data from pipeline result
        .filter((data: any) => data && Object.keys(data).length > 0)
        .map((data: any) => ({
          id: data.id,
          name: data.name,
          slug: data.slug || '',
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          championshipId: data.championshipId,
          registrationOpen: data.registrationOpen === 'true',
          regulationsEnabled: data.regulationsEnabled === 'true',
        }));
    } catch (error) {
      // console.error('Error getting multiple seasons from cache:', error);
      return [];
    }
  }

  async invalidateSeasonCache(
    seasonId: string,
    championshipId?: string
  ): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      const key = `season:${seasonId}`;
      await this.client.del(key);

      // Remove from global seasons set
      await this.client.sRem('seasons:all', seasonId);

      // Remove season ID from championship's seasons set if championshipId is provided
      if (championshipId) {
        const championshipSeasonsKey = `championship:${championshipId}:seasons`;
        await this.client.sRem(championshipSeasonsKey, seasonId);
      }

      return true;
    } catch (error) {
      // console.error('Error invalidating season cache:', error);
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
      // console.error('Error getting championship season IDs:', error);
      return [];
    }
  }

  // Clean up championship seasons index when championship is deleted
  async invalidateChampionshipSeasonsIndex(
    championshipId: string
  ): Promise<boolean> {
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
      // console.error('Error invalidating championship seasons index:', error);
      return false;
    }
  }

  // Category-specific cache methods with Redis Sets for better performance
  async cacheCategoryBasicInfo(
    categoryId: string,
    data: any
  ): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      // Use Redis Hash to store category data (more efficient than JSON strings)
      const categoryKey = `category:${categoryId}`;

      // Get existing data to preserve pilots
      const existingData = await this.client.hGetAll(categoryKey);

      const categoryData = {
        id: data.id,
        name: data.name,
        ballast: data.ballast,
        maxPilots: data.maxPilots.toString(),
        minimumAge: data.minimumAge.toString(),
        seasonId: data.seasonId,
        // Preserve existing pilots data if it exists
        ...(existingData.pilots && { pilots: existingData.pilots }),
      };

      // Store category data as Redis Hash
      await this.client.hSet(categoryKey, categoryData);

      if (data.seasonId) {
        // Add category ID to season's categories set for fast lookup
        const seasonCategoriesKey = `season:${data.seasonId}:categories`;
        await this.client.sAdd(seasonCategoriesKey, categoryId);

        // Also add to global categories set for bulk operations
        await this.client.sAdd('categories:all', categoryId);
      }

      return true;
    } catch (error) {
      // console.error('Error caching category basic info:', error);
      return false;
    }
  }

  async getCachedCategoryBasicInfo(categoryId: string): Promise<any | null> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      const key = `category:${categoryId}`;
      const data = await this.client.hGetAll(key);

      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      // Convert string numbers back to integers
      const result: any = {
        id: data.id,
        name: data.name,
        ballast: data.ballast,
        maxPilots: parseInt(data.maxPilots),
        minimumAge: parseInt(data.minimumAge),
        seasonId: data.seasonId,
      };

      // Include pilots if they exist
      if (data.pilots) {
        result.pilots = JSON.parse(data.pilots);
      }

      return result;
    } catch (error) {
      // console.error('Error getting cached category basic info:', error);
      return null;
    }
  }

  // Get multiple categories at once using Redis pipeline (ultra-fast)
  async getMultipleCategoriesBasicInfo(categoryIds: string[]): Promise<any[]> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      if (categoryIds.length === 0) {
        return [];
      }

      // Use Redis pipeline for batch operations
      const pipeline = this.client.multi();

      categoryIds.forEach(id => {
        pipeline.hGetAll(`category:${id}`);
      });

      const results = await pipeline.exec();

      if (!results) {
        return [];
      }

      // Process results and convert back to proper format
      return results
        .map((result: any) => result[1]) // Get the actual data from pipeline result
        .filter((data: any) => data && Object.keys(data).length > 0)
        .map((data: any) => {
          const result: any = {
            id: data.id,
            name: data.name,
            ballast: data.ballast,
            maxPilots: parseInt(data.maxPilots),
            minimumAge: parseInt(data.minimumAge),
            seasonId: data.seasonId,
          };

          // Include pilots if they exist
          if (data.pilots) {
            result.pilots = JSON.parse(data.pilots);
          }

          return result;
        });
    } catch (error) {
      // console.error('Error getting multiple categories from cache:', error);
      return [];
    }
  }

  async invalidateCategoryCache(
    categoryId: string,
    seasonId?: string
  ): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      // Remove category data
      const categoryKey = `category:${categoryId}`;
      await this.client.del(categoryKey);

      // Remove from global categories set
      await this.client.sRem('categories:all', categoryId);

      // Remove category ID from season's categories set if seasonId is provided
      if (seasonId) {
        const seasonCategoriesKey = `season:${seasonId}:categories`;
        await this.client.sRem(seasonCategoriesKey, categoryId);
      }

      return true;
    } catch (error) {
      // console.error('Error invalidating category cache:', error);
      return false;
    }
  }

  // Get all category IDs for a season (for fast bulk retrieval)
  async getSeasonCategoryIds(seasonId: string): Promise<string[]> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      const key = `season:${seasonId}:categories`;
      const categoryIds = await this.client.sMembers(key);
      return categoryIds || [];
    } catch (error) {
      // console.error('Error getting season category IDs:', error);
      return [];
    }
  }

  // Stage-specific cache methods with Redis Sets for better performance
  async cacheStageBasicInfo(stageId: string, data: any): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      // Use Redis Hash to store stage data (more efficient than JSON strings)
      const stageKey = `stage:${stageId}`;
      const stageData = {
        id: data.id,
        name: data.name,
        date: data.date instanceof Date ? data.date.toISOString() : data.date,
        time: data.time,
        raceTrackId: data.raceTrackId,
        trackLayoutId: data.trackLayoutId || '',
        streamLink: data.streamLink || '',
        briefing: data.briefing || '',
        seasonId: data.seasonId,
        stageResults: data.stageResults
          ? JSON.stringify(data.stageResults)
          : '',
      };

      // Store stage data as Redis Hash
      await this.client.hSet(stageKey, stageData);

      if (data.seasonId) {
        // Add stage ID to season's stages set for fast lookup
        const seasonStagesKey = `season:${data.seasonId}:stages`;
        await this.client.sAdd(seasonStagesKey, stageId);

        // Also add to global stages set for bulk operations
        await this.client.sAdd('stages:all', stageId);
      }

      return true;
    } catch (error) {
      // console.error('Error caching stage basic info:', error);
      return false;
    }
  }

  async getCachedStageBasicInfo(stageId: string): Promise<any | null> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      const key = `stage:${stageId}`;
      const data = await this.client.hGetAll(key);

      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      // Convert date string back to Date object
      const result: any = {
        id: data.id,
        name: data.name,
        date: new Date(data.date),
        time: data.time,
        raceTrackId: data.raceTrackId,
        trackLayoutId: data.trackLayoutId || '',
        streamLink: data.streamLink || '',
        briefing: data.briefing || '',
        seasonId: data.seasonId,
      };

      // Parse stageResults if it exists
      if (data.stageResults) {
        try {
          result.stageResults = JSON.parse(data.stageResults);
        } catch (error) {
          // If parsing fails, set as empty object
          result.stageResults = {};
        }
      }

      return result;
    } catch (error) {
      // console.error('Error getting cached stage basic info:', error);
      return null;
    }
  }

  // Get multiple stages at once using Redis pipeline (ultra-fast)
  async getMultipleStagesBasicInfo(stageIds: string[]): Promise<any[]> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      if (stageIds.length === 0) {
        return [];
      }

      // Use Redis pipeline for batch operations
      const pipeline = this.client.multi();

      stageIds.forEach(id => {
        pipeline.hGetAll(`stage:${id}`);
      });

      const results = await pipeline.exec();

      if (!results) {
        return [];
      }

      // Process results and convert back to proper format
      return results
        .map((result: any) => result[1]) // Get the actual data from pipeline result
        .filter((data: any) => data && Object.keys(data).length > 0)
        .map((data: any) => {
          const stageData: any = {
            id: data.id,
            name: data.name,
            date: new Date(data.date),
            time: data.time,
            raceTrackId: data.raceTrackId,
            trackLayoutId: data.trackLayoutId || '',
            streamLink: data.streamLink || '',
            briefing: data.briefing || '',
            seasonId: data.seasonId,
          };

          // Parse stageResults if it exists
          if (data.stageResults) {
            try {
              stageData.stageResults = JSON.parse(data.stageResults);
            } catch (error) {
              // If parsing fails, set as empty object
              stageData.stageResults = {};
            }
          }

          return stageData;
        });
    } catch (error) {
      // console.error('Error getting multiple stages from cache:', error);
      return [];
    }
  }

  async invalidateStageCache(
    stageId: string,
    seasonId?: string
  ): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      // Remove stage data
      const stageKey = `stage:${stageId}`;
      await this.client.del(stageKey);

      // Remove from global stages set
      await this.client.sRem('stages:all', stageId);

      // Remove stage ID from season's stages set if seasonId is provided
      if (seasonId) {
        const seasonStagesKey = `season:${seasonId}:stages`;
        await this.client.sRem(seasonStagesKey, stageId);
      }

      return true;
    } catch (error) {
      // console.error('Error invalidating stage cache:', error);
      return false;
    }
  }

  // Get all stage IDs for a season (for fast bulk retrieval)
  async getSeasonStageIds(seasonId: string): Promise<string[]> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      const key = `season:${seasonId}:stages`;
      const stageIds = await this.client.sMembers(key);
      return stageIds || [];
    } catch (error) {
      // console.error('Error getting season stage IDs:', error);
      return [];
    }
  }

  // Regulation-specific cache methods with Redis Sets for better performance
  async cacheRegulationBasicInfo(
    regulationId: string,
    data: any
  ): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      // Use Redis Hash to store regulation data (more efficient than JSON strings)
      const regulationKey = `regulation:${regulationId}`;
      const regulationData = {
        id: data.id,
        title: data.title,
        content: data.content,
        order: data.order.toString(),
        seasonId: data.seasonId,
      };

      // Store regulation data as Redis Hash
      await this.client.hSet(regulationKey, regulationData);

      if (data.seasonId) {
        // Add regulation ID to season's regulations set for fast lookup
        const seasonRegulationsKey = `season:${data.seasonId}:regulations`;
        await this.client.sAdd(seasonRegulationsKey, regulationId);

        // Also add to global regulations set for bulk operations
        await this.client.sAdd('regulations:all', regulationId);
      }

      return true;
    } catch (error) {
      // console.error('Error caching regulation basic info:', error);
      return false;
    }
  }

  async getCachedRegulationBasicInfo(
    regulationId: string
  ): Promise<any | null> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      const key = `regulation:${regulationId}`;
      const data = await this.client.hGetAll(key);

      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      return {
        id: data.id,
        title: data.title,
        content: data.content,
        order: parseInt(data.order),
        seasonId: data.seasonId,
      };
    } catch (error) {
      // console.error('Error getting cached regulation basic info:', error);
      return null;
    }
  }

  // Get multiple regulations at once using Redis pipeline (ultra-fast)
  async getMultipleRegulationsBasicInfo(
    regulationIds: string[]
  ): Promise<any[]> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      if (regulationIds.length === 0) {
        return [];
      }

      // Use Redis pipeline for batch operations
      const pipeline = this.client.multi();

      regulationIds.forEach(id => {
        pipeline.hGetAll(`regulation:${id}`);
      });

      const results = await pipeline.exec();

      if (!results) {
        return [];
      }

      // Process results and convert back to proper format
      return results
        .map((result: any) => result[1]) // Get the actual data from pipeline result
        .filter((data: any) => data && Object.keys(data).length > 0)
        .map((data: any) => ({
          id: data.id,
          title: data.title,
          content: data.content,
          order: parseInt(data.order),
          seasonId: data.seasonId,
        }));
    } catch (error) {
      // console.error('Error getting multiple regulations from cache:', error);
      return [];
    }
  }

  async invalidateRegulationCache(
    regulationId: string,
    seasonId?: string
  ): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      // Remove regulation data
      const regulationKey = `regulation:${regulationId}`;
      await this.client.del(regulationKey);

      // Remove from global regulations set
      await this.client.sRem('regulations:all', regulationId);

      // Remove regulation ID from season's regulations set if seasonId is provided
      if (seasonId) {
        const seasonRegulationsKey = `season:${seasonId}:regulations`;
        await this.client.sRem(seasonRegulationsKey, regulationId);
      }

      return true;
    } catch (error) {
      // console.error('Error invalidating regulation cache:', error);
      return false;
    }
  }

  // Get all regulation IDs for a season (for fast bulk retrieval)
  async getSeasonRegulationIds(seasonId: string): Promise<string[]> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      const key = `season:${seasonId}:regulations`;
      const regulationIds = await this.client.sMembers(key);
      return regulationIds || [];
    } catch (error) {
      // console.error('Error getting season regulation IDs:', error);
      return [];
    }
  }

  // Clean up season categories, stages and regulations indexes when season is deleted
  async invalidateSeasonIndexes(seasonId: string): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      const categoriesKey = `season:${seasonId}:categories`;
      const stagesKey = `season:${seasonId}:stages`;
      const regulationsKey = `season:${seasonId}:regulations`;

      await Promise.all([
        this.client.del(categoriesKey),
        this.client.del(stagesKey),
        this.client.del(regulationsKey),
      ]);

      return true;
    } catch (error) {
      // console.error('Error invalidating season indexes:', error);
      return false;
    }
  }

  // Cache pilots by category
  async cacheCategoryPilots(
    categoryId: string,
    pilots: any[]
  ): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      const categoryKey = `category:${categoryId}`;

      // Get existing category data
      const existingData = await this.client.hGetAll(categoryKey);

      // Extract userIds from pilots
      const userIds = pilots.map(pilot => pilot.userId);

      // Update category data with pilots
      const updatedData = {
        ...existingData,
        pilots: JSON.stringify(userIds),
      };

      // Store updated category data
      await this.client.hSet(categoryKey, updatedData);

      return true;
    } catch (error) {
      console.error('Error caching category pilots:', error);
      return false;
    }
  }

  // Get cached pilots for a category
  async getCachedCategoryPilots(categoryId: string): Promise<string[]> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      const categoryKey = `category:${categoryId}`;
      const categoryData = await this.client.hGetAll(categoryKey);

      if (!categoryData || !categoryData.pilots) {
        return [];
      }

      return JSON.parse(categoryData.pilots);
    } catch (error) {
      console.error('Error getting cached category pilots:', error);
      return [];
    }
  }

  // Invalidate category pilots cache
  async invalidateCategoryPilotsCache(categoryId: string): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      const categoryKey = `category:${categoryId}`;

      // Remove pilots field from category data
      await this.client.hDel(categoryKey, 'pilots');

      return true;
    } catch (error) {
      console.error('Error invalidating category pilots cache:', error);
      return false;
    }
  }

  // Check if a user is in a category (utility method)
  async isUserInCategory(categoryId: string, userId: string): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      const categoryKey = `category:${categoryId}`;
      const categoryData = await this.client.hGetAll(categoryKey);

      if (!categoryData || !categoryData.pilots) {
        return false;
      }

      const userIds = JSON.parse(categoryData.pilots);
      return userIds.includes(userId);
    } catch (error) {
      console.error('Error checking if user is in category:', error);
      return false;
    }
  }

  // RaceTrack-specific cache methods with Redis Hashes for maximum performance
  async cacheRaceTrackBasicInfo(
    raceTrackId: string,
    data: any
  ): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      // Use Redis Hash to store race track data
      const raceTrackKey = `raceTrack:${raceTrackId}`;
      const raceTrackData = {
        id: data.id,
        name: data.name,
        city: data.city,
        state: data.state,
        address: data.address,
        trackLayouts: JSON.stringify(data.trackLayouts || []),
        defaultFleets: JSON.stringify(data.defaultFleets || []),
        generalInfo: data.generalInfo || '',
        isActive: data.isActive ? 'true' : 'false',
        createdAt:
          data.createdAt instanceof Date
            ? data.createdAt.toISOString()
            : data.createdAt,
        updatedAt:
          data.updatedAt instanceof Date
            ? data.updatedAt.toISOString()
            : data.updatedAt,
      };

      // Store race track data as Redis Hash
      await this.client.hSet(raceTrackKey, raceTrackData);

      // Add to global race tracks set for bulk operations
      await this.client.sAdd('raceTracks:all', raceTrackId);

      return true;
    } catch (error) {
      return false;
    }
  }

  async getCachedRaceTrackBasicInfo(raceTrackId: string): Promise<any | null> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      const key = `raceTrack:${raceTrackId}`;
      const data = await this.client.hGetAll(key);
      if (Object.keys(data).length === 0) {
        return null;
      }
      return {
        ...data,
        trackLayouts: JSON.parse(data.trackLayouts || '[]'),
        defaultFleets: JSON.parse(data.defaultFleets || '[]'),
        isActive: data.isActive === 'true',
      };
    } catch (error) {
      return null;
    }
  }

  async invalidateRaceTrackCache(raceTrackId: string): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      const key = `raceTrack:${raceTrackId}`;
      await this.client.del(key);
      await this.client.sRem('raceTracks:all', raceTrackId);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Season Classification cache methods
  async cacheSeasonClassification(
    seasonId: string,
    classificationData: any
  ): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      const seasonKey = `season:${seasonId}`;

      // Convert classification data to JSON string for storage in Redis hash
      const classificationJson = JSON.stringify(classificationData);

      // Add classification field to the existing season hash
      await this.client.hSet(seasonKey, 'classification', classificationJson);

      // Removed TTL - season data should be persistent and not expire

      return true;
    } catch (error) {
      // console.error('Error caching season classification:', error);
      return false;
    }
  }

  async getSeasonClassification(seasonId: string): Promise<any | null> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      const seasonKey = `season:${seasonId}`;
      const classificationJson = await this.client.hGet(
        seasonKey,
        'classification'
      );

      if (!classificationJson) {
        return null;
      }

      return JSON.parse(classificationJson);
    } catch (error) {
      // console.error('Error getting season classification from cache:', error);
      return null;
    }
  }

  async invalidateSeasonClassification(seasonId: string): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      const seasonKey = `season:${seasonId}`;

      // Remove only the classification field from the season hash
      await this.client.hDel(seasonKey, 'classification');

      return true;
    } catch (error) {
      // console.error('Error invalidating season classification cache:', error);
      return false;
    }
  }

  // User-specific cache methods
  async cacheUserBasicInfo(userId: string, data: any): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      // Use Redis Hash to store user data (more efficient than JSON strings)
      const userKey = `user:${userId}`;
      const userData = {
        id: data.id,
        name: data.name,
        profilePicture: data.profilePicture || '',
        active: data.active ? 'true' : 'false',
        nickname: data.nickname || '',
      };

      // Store user data as Redis Hash
      await this.client.hSet(userKey, userData);

      // Add to global users set for bulk operations
      await this.client.sAdd('users:all', userId);

      return true;
    } catch (error) {
      // console.error('Error caching user basic info:', error);
      return false;
    }
  }

  async getCachedUserBasicInfo(userId: string): Promise<any | null> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      const key = `user:${userId}`;
      const data = await this.client.hGetAll(key);

      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      return {
        id: data.id,
        name: data.name,
        profilePicture: data.profilePicture || '',
        active: data.active === 'true',
        nickname: data.nickname || '',
      };
    } catch (error) {
      // console.error('Error getting cached user basic info:', error);
      return null;
    }
  }

  // Cache multiple users at once using Redis pipeline (ultra-fast)
  async cacheMultipleUsersBasicInfo(
    userDataArray: Array<{ userId: string; userData: any }>
  ): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      if (userDataArray.length === 0) {
        return true;
      }

      // Use Redis pipeline for batch operations
      const pipeline = this.client.multi();

      userDataArray.forEach(({ userId, userData }) => {
        const userKey = `user:${userId}`;
        const redisUserData = {
          id: userData.id,
          name: userData.name,
          profilePicture: userData.profilePicture || '',
          active: userData.active ? 'true' : 'false',
          nickname: userData.nickname || '',
        };

        // Store user data as Redis Hash
        pipeline.hSet(userKey, redisUserData);

        // Add to global users set for bulk operations
        pipeline.sAdd('users:all', userId);
      });

      await pipeline.exec();
      return true;
    } catch (error) {
      // console.error('Error caching multiple users:', error);
      return false;
    }
  }

  // Get multiple users at once using Redis pipeline (ultra-fast)
  async getMultipleUsersBasicInfo(userIds: string[]): Promise<any[]> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      if (userIds.length === 0) {
        return [];
      }

      // Use Redis pipeline for batch operations
      const pipeline = this.client.multi();

      userIds.forEach(id => {
        pipeline.hGetAll(`user:${id}`);
      });

      const results = await pipeline.exec();

      if (!results) {
        return [];
      }

      // Process results and convert back to proper format
      return results
        .map((result: any) => result[1]) // Get the actual data from pipeline result
        .filter((data: any) => data && Object.keys(data).length > 0)
        .map((data: any) => ({
          id: data.id,
          name: data.name,
          profilePicture: data.profilePicture || '',
          active: data.active === 'true',
          nickname: data.nickname || '',
        }));
    } catch (error) {
      // console.error('Error getting multiple users from cache:', error);
      return [];
    }
  }

  async invalidateUserCache(userId: string): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      // Remove user data
      const userKey = `user:${userId}`;
      await this.client.del(userKey);

      // Remove from global users set
      await this.client.sRem('users:all', userId);

      return true;
    } catch (error) {
      // console.error('Error invalidating user cache:', error);
      return false;
    }
  }

  // Get all user IDs (for fast bulk retrieval)
  async getAllUserIds(): Promise<string[]> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      const userIds = await this.client.sMembers('users:all');
      return userIds || [];
    } catch (error) {
      // console.error('Error getting all user IDs:', error);
      return [];
    }
  }

  // Cache multiple categories at once using Redis pipeline (ultra-fast)
  async cacheMultipleCategoriesPilots(
    categoryPilotsArray: Array<{ categoryId: string; pilots: any[] }>
  ): Promise<boolean> {
    try {
      if (!this.client || !this.client.isOpen) {
        await this.connect();
      }

      if (!this.client) {
        throw new Error('Failed to create Redis client');
      }

      if (categoryPilotsArray.length === 0) {
        return true;
      }

      // Use Redis pipeline for batch operations
      const pipeline = this.client.multi();

      categoryPilotsArray.forEach(({ categoryId, pilots }) => {
        const categoryKey = `category:${categoryId}`;

        // Extract userIds from pilots
        const userIds = pilots.map(pilot => pilot.userId);

        // Update category data with pilots
        pipeline.hSet(categoryKey, 'pilots', JSON.stringify(userIds));
      });

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Error caching multiple categories pilots:', error);
      return false;
    }
  }
}
