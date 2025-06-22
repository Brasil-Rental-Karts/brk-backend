import { Client } from 'pg';
import { RedisService } from './redis.service';
import { redisConfig } from '../config/redis.config';
import { AppDataSource } from '../config/database.config';
import { Championship } from '../models/championship.entity';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface DatabaseEvent {
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  data: any;
}

export class DatabaseEventsService {
  private static instance: DatabaseEventsService;
  private client: Client | null = null;
  private redisService: RedisService;
  private isListening = false;

  private constructor() {
    this.redisService = RedisService.getInstance();
  }

  public static getInstance(): DatabaseEventsService {
    if (!DatabaseEventsService.instance) {
      DatabaseEventsService.instance = new DatabaseEventsService();
    }
    return DatabaseEventsService.instance;
  }

  async publishEvent(event: DatabaseEvent): Promise<boolean> {
    try {
      console.log(`Publishing database event: ${event.operation} on ${event.table}`);
      
      // Track Championships, Seasons, Categories and Stages tables
      if (['Championships', 'Seasons', 'Categories', 'Stages'].includes(event.table)) {
        // Publish the message to Redis
        const success = await this.redisService.publishMessage(event);
        
        if (success) {
          console.log('Successfully sent to Redis');
        } else {
          console.error('Failed to send to Redis');
        }
        
        return success;
      }
      
      return true; // Return true for non-tracked tables
    } catch (error) {
      console.error('Error publishing database event:', error);
      return false;
    }
  }

  async startListening(): Promise<void> {
    if (this.isListening) {
      console.log('Already listening for database events');
      return;
    }

    try {
      // Create a new PostgreSQL client dedicated to listening for notifications
      this.client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || 'brk_competition',
        ssl: process.env.DB_SSL === 'true' ? 
          { rejectUnauthorized: false } : 
          false,
      });

      await this.client.connect();
      
      // Listen for database events
      this.client.query('LISTEN database_events');
      
      // Set up notification handler
      this.client.on('notification', async (msg) => {
        try {
          if (msg.channel === 'database_events' && msg.payload) {
            const payload = JSON.parse(msg.payload);
            
            // Check if the table is in our tracked tables
            if (redisConfig.trackedTables.includes(payload.table)) {
              console.log(`Received notification for ${payload.table} - ${payload.operation}`);
              
              // Publish the message to Redis
              const success = await this.redisService.publishMessage(payload);
              
              if (success) {
                console.log('Successfully sent to Redis');
              } else {
                console.error('Failed to send to Redis');
              }
            }
          }
        } catch (error) {
          console.error('Error processing notification:', error);
        }
      });

      // Subscribe to Redis channel to handle caching
      await this.redisService.subscribeToChannel(redisConfig.channelName, this.handleDatabaseEvent.bind(this));

      this.isListening = true;
      console.log('Started listening for database events');
    } catch (error) {
      console.error('Error setting up database event listener:', error);
    }
  }

  private async handleDatabaseEvent(event: any): Promise<void> {
    try {
      console.log(`Processing database event: ${event.operation} on ${event.table}`);
      
      if (event.table === 'Championships') {
        switch (event.operation) {
          case 'INSERT':
          case 'UPDATE':
            // Cache the championship info with image
            if (event.data && event.data.id) {
              const championshipRepo = AppDataSource.getRepository(Championship);
              const fullChampionship = await championshipRepo.findOneBy({ id: event.data.id });

              if (fullChampionship) {
                await this.redisService.cacheChampionshipBasicInfo(fullChampionship.id, fullChampionship);
                console.log(`Cached championship info for ID: ${fullChampionship.id}`);
              }
            }
            break;
          case 'DELETE':
            // Remove championship from cache and clean up seasons index
            if (event.data && event.data.id) {
              await this.redisService.invalidateChampionshipCache(event.data.id);
              await this.redisService.invalidateChampionshipSeasonsIndex(event.data.id);
              console.log(`Invalidated cache for championship ID: ${event.data.id}`);
            }
            break;
        }
      }

      if (event.table === 'Seasons') {
        switch (event.operation) {
          case 'INSERT':
          case 'UPDATE':
            // Cache the season info with championship relationship
            if (event.data && event.data.id) {
              const seasonInfo = {
                id: event.data.id,
                name: event.data.name,
                slug: event.data.slug,
                startDate: event.data.startDate,
                endDate: event.data.endDate,
                championshipId: event.data.championshipId,
                registrationOpen: event.data.registrationOpen
              };
              await this.redisService.cacheSeasonBasicInfo(event.data.id, seasonInfo);
              console.log(`Cached season info for ID: ${event.data.id}, Championship: ${event.data.championshipId}, Registration Open: ${event.data.registrationOpen}`);
            }
            break;
          case 'DELETE':
            // Remove season from cache and clean up related indexes
            if (event.data && event.data.id) {
              await this.redisService.invalidateSeasonCache(event.data.id, event.data.championshipId);
              await this.redisService.invalidateSeasonIndexes(event.data.id);
              console.log(`Invalidated cache for season ID: ${event.data.id}`);
            }
            break;
        }
      }

      if (event.table === 'Categories') {
        switch (event.operation) {
          case 'INSERT':
          case 'UPDATE':
            // Cache the category info with season relationship
            if (event.data && event.data.id) {
              const categoryInfo = {
                id: event.data.id,
                name: event.data.name,
                ballast: event.data.ballast,
                maxPilots: event.data.maxPilots,
                minimumAge: event.data.minimumAge,
                seasonId: event.data.seasonId
              };
              await this.redisService.cacheCategoryBasicInfo(event.data.id, categoryInfo);
              console.log(`Cached category info for ID: ${event.data.id}, Season: ${event.data.seasonId}`);
            }
            break;
          case 'DELETE':
            // Remove category from cache and season categories index
            if (event.data && event.data.id) {
              await this.redisService.invalidateCategoryCache(event.data.id, event.data.seasonId);
              console.log(`Invalidated cache for category ID: ${event.data.id}`);
            }
            break;
        }
      }

      if (event.table === 'Stages') {
        switch (event.operation) {
          case 'INSERT':
          case 'UPDATE':
            // Cache the stage info with season relationship
            if (event.data && event.data.id) {
              const stageInfo = {
                id: event.data.id,
                name: event.data.name,
                date: event.data.date,
                time: event.data.time,
                kartodrome: event.data.kartodrome,
                streamLink: event.data.streamLink,
                briefing: event.data.briefing,
                seasonId: event.data.seasonId
              };
              await this.redisService.cacheStageBasicInfo(event.data.id, stageInfo);
              console.log(`Cached stage info for ID: ${event.data.id}, Season: ${event.data.seasonId}`);
            }
            break;
          case 'DELETE':
            // Remove stage from cache and season stages index
            if (event.data && event.data.id) {
              await this.redisService.invalidateStageCache(event.data.id, event.data.seasonId);
              console.log(`Invalidated cache for stage ID: ${event.data.id}`);
            }
            break;
        }
      }
    } catch (error) {
      console.error('Error handling database event:', error);
    }
  }

  async stopListening(): Promise<void> {
    if (!this.isListening || !this.client) {
      return;
    }

    try {
      // Unlisten
      this.client.query('UNLISTEN database_events');
      
      // End the client connection
      await this.client.end();
      this.client = null;
      this.isListening = false;
      
      console.log('Stopped listening for database events');
    } catch (error) {
      console.error('Error stopping database event listener:', error);
    }
  }
} 