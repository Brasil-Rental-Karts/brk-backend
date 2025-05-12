import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const rabbitMQConfig = {
  url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  exchange: process.env.RABBITMQ_EXCHANGE || 'database_events',
  queue: process.env.RABBITMQ_QUEUE || 'database_changes',
  routingKey: process.env.RABBITMQ_ROUTING_KEY || 'database.changes',
  // List of tables to track changes
  trackedTables: ['Clubs'], // We'll start with Clubs table but can expand later
  tls: {
    rejectUnauthorized: false
  }
}; 