import { connect, Connection, Channel } from 'amqplib';
import { rabbitMQConfig } from '../config/rabbitmq.config';

export class RabbitMQService {
  private static instance: RabbitMQService;
  private connection: any = null;
  private channel: any = null;
  private connectionPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): RabbitMQService {
    if (!RabbitMQService.instance) {
      RabbitMQService.instance = new RabbitMQService();
    }
    return RabbitMQService.instance;
  }

  async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise<void>(async (resolve, reject) => {
      try {
        // Connect to RabbitMQ
        this.connection = await connect(rabbitMQConfig.url);
        this.channel = await this.connection.createChannel();
        
        // Setup exchange
        await this.channel.assertExchange(rabbitMQConfig.exchange, 'topic', { durable: true });
        
        // Setup queue
        await this.channel.assertQueue(rabbitMQConfig.queue, { durable: true });
        
        // Bind queue to exchange with routing key
        await this.channel.bindQueue(
          rabbitMQConfig.queue, 
          rabbitMQConfig.exchange, 
          rabbitMQConfig.routingKey
        );
        
        console.log('Connected to RabbitMQ and set up exchange/queue');
        resolve();
      } catch (error) {
        console.error('Failed to connect to RabbitMQ:', error);
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  async publishMessage(message: any): Promise<boolean> {
    try {
      if (!this.channel) {
        await this.connect();
      }

      if (!this.channel) {
        throw new Error('Failed to create channel');
      }

      const success = this.channel.publish(
        rabbitMQConfig.exchange,
        rabbitMQConfig.routingKey,
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );

      return success;
    } catch (error) {
      console.error('Error publishing message to RabbitMQ:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      
      this.connectionPromise = null;
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error);
    }
  }
} 