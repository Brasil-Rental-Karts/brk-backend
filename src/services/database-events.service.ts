import { Client } from 'pg';
import { DatabaseChangeEventsService } from './database-change-events.service';
import { redisConfig } from '../config/redis.config';
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
  private databaseChangeEventsService: DatabaseChangeEventsService;
  private isListening = false;

  private constructor() {
    this.databaseChangeEventsService = DatabaseChangeEventsService.getInstance();
  }

  public static getInstance(): DatabaseEventsService {
    if (!DatabaseEventsService.instance) {
      DatabaseEventsService.instance = new DatabaseEventsService();
    }
    return DatabaseEventsService.instance;
  }

  /**
   * Publica um evento de alteração diretamente
   * Este método é usado pelos serviços quando fazem alterações manuais
   */
  async publishEvent(event: DatabaseEvent): Promise<boolean> {
    try {
      console.log(`Publishing database event: ${event.operation} on ${event.table}`);
      
      // Verifica se a tabela é monitorada
      if (redisConfig.trackedTables.includes(event.table)) {
        // Publica o evento usando o novo serviço
        const success = await this.databaseChangeEventsService.onEntityChange(
          event.operation,
          event.table,
          event.data
        );
        
        if (success) {
          console.log('Successfully published to Redis');
        } else {
          console.error('Failed to publish to Redis');
        }
        
        return success;
      }
      
      return true; // Return true for non-tracked tables
    } catch (error) {
      console.error('Error publishing database event:', error);
      return false;
    }
  }

  /**
   * Inicia o listener do PostgreSQL para capturar triggers de alterações
   * Este método escuta por notificações do banco e publica eventos no Redis
   */
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
              
              // Publica o evento usando o novo serviço
              const success = await this.databaseChangeEventsService.onEntityChange(
                payload.operation,
                payload.table,
                payload.data || payload
              );
              
              if (success) {
                console.log('Successfully published to Redis');
              } else {
                console.error('Failed to publish to Redis');
              }
            }
          }
        } catch (error) {
          console.error('Error processing notification:', error);
        }
      });

      this.isListening = true;
      console.log('Started listening for database events from PostgreSQL triggers');
    } catch (error) {
      console.error('Error setting up database event listener:', error);
    }
  }

  /**
   * Para o listener do PostgreSQL
   */
  async stopListening(): Promise<void> {
    if (this.client && this.isListening) {
      try {
        await this.client.end();
        this.client = null;
        this.isListening = false;
        console.log('Stopped listening for database events');
      } catch (error) {
        console.error('Error stopping database event listener:', error);
      }
    }
  }

  /**
   * Subscreve para receber eventos de alterações do Redis
   * Usado por outras aplicações que precisam ser notificadas
   */
  async subscribeToChanges(callback: (event: any) => void): Promise<boolean> {
    return this.databaseChangeEventsService.subscribeToEvents(callback);
  }

  /**
   * Método legado para compatibilidade - redireciona para o novo serviço
   */
  async onEntityChange(
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    entityName: string,
    entityData: any
  ): Promise<void> {
    await this.databaseChangeEventsService.onEntityChange(operation, entityName, entityData);
  }
} 