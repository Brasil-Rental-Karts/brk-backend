import { Client } from 'pg';
import { RedisService } from './redis.service';
import { redisConfig } from '../config/redis.config';
import { AppDataSource } from '../config/database.config';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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
            // Cache the championship basic info (only the fields from "Sobre o Campeonato")
            if (event.data && event.data.id) {
              const basicInfo = {
                id: event.data.id,
                name: event.data.name,
                shortDescription: event.data.shortDescription || '',
                fullDescription: event.data.fullDescription || ''
              };
              await this.redisService.cacheChampionshipBasicInfo(event.data.id, basicInfo);
              console.log(`Cached championship basic info for ID: ${event.data.id}`);
            }
            break;
          case 'DELETE':
            // Remove from cache
            if (event.data && event.data.id) {
              await this.redisService.invalidateChampionshipCache(event.data.id);
              console.log(`Invalidated cache for championship ID: ${event.data.id}`);
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