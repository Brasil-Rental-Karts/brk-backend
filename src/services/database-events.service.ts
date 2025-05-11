import { Client } from 'pg';
import { RabbitMQService } from './rabbitmq.service';
import { rabbitMQConfig } from '../config/rabbitmq.config';
import { AppDataSource } from '../config/database.config';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export class DatabaseEventsService {
  private static instance: DatabaseEventsService;
  private client: Client | null = null;
  private rabbitMQService: RabbitMQService;
  private isListening = false;

  private constructor() {
    this.rabbitMQService = RabbitMQService.getInstance();
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
            if (rabbitMQConfig.trackedTables.includes(payload.table)) {
              console.log(`Received notification for ${payload.table} - ${payload.operation}`);
              
              // Publish the message to RabbitMQ
              const success = await this.rabbitMQService.publishMessage(payload);
              
              if (success) {
                console.log('Successfully sent to RabbitMQ');
              } else {
                console.error('Failed to send to RabbitMQ');
              }
            }
          }
        } catch (error) {
          console.error('Error processing notification:', error);
        }
      });

      this.isListening = true;
      console.log('Started listening for database events');
    } catch (error) {
      console.error('Error setting up database event listener:', error);
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