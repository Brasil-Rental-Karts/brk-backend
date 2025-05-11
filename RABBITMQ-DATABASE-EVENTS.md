# PostgreSQL Database Events to RabbitMQ

This system allows for tracking changes (INSERT, UPDATE, DELETE) in selected PostgreSQL tables and sending them to a RabbitMQ queue for processing by other services.

## How It Works

1. PostgreSQL triggers are attached to selected tables.
2. When a change occurs, a notification is sent via PostgreSQL's `pg_notify` mechanism.
3. Our application listens for these notifications and forwards them to RabbitMQ.
4. Other services can subscribe to the RabbitMQ queue to receive and process these events.

## Message Format

Messages sent to RabbitMQ have the following structure:

```json
{
  "operation": "INSERT", // or "UPDATE" or "DELETE"
  "table": "Clubs", // The name of the table that changed
  "timestamp": 1633123456.789, // UNIX timestamp with milliseconds
  "data": {
    // The full row data after the change (for INSERT/UPDATE) or before deletion (for DELETE)
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Manchester United FC",
    "foundationDate": "1878-01-01",
    "description": "...",
    "logoUrl": "...",
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-01T00:00:00Z"
  }
}
```

## Configuration

The system uses environment variables for configuration:

```
# RabbitMQ configuration (CloudAMQP)
RABBITMQ_URL=amqp://username:password@host:port/vhost
RABBITMQ_EXCHANGE=database_events
RABBITMQ_QUEUE=database_changes
RABBITMQ_ROUTING_KEY=database.changes
```

## Currently Tracked Tables

The system is currently configured to track changes in the following tables:

- `Clubs`

## Adding New Tables

To add a new table to the tracking system:

### Method 1: Using the CLI Tool

Run the following command:

```bash
npm run add-table-trigger TableName
```

This will:
1. Create the necessary PostgreSQL trigger on the table
2. Add the table to the tracked tables list (temporarily)

**Important**: After using this tool, you must also update the `trackedTables` array in `src/config/rabbitmq.config.ts` to make the change permanent.

### Method 2: Manually Adding a Table

1. Create a new migration file:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTriggerToNewTable1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS newtable_notify_trigger ON "NewTable";
      CREATE TRIGGER newtable_notify_trigger
      AFTER INSERT OR UPDATE OR DELETE ON "NewTable"
      FOR EACH ROW EXECUTE FUNCTION notify_rabbitmq();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS newtable_notify_trigger ON "NewTable";
    `);
  }
}
```

2. Run the migration:

```bash
npm run migration:run
```

3. Update the tracked tables in `src/config/rabbitmq.config.ts`:

```typescript
export const rabbitMQConfig = {
  // ...other config
  trackedTables: ['Clubs', 'NewTable'], // Add your new table here
};
```

## Consuming Events in Another Service

To consume these events in another service, you'll need to connect to the same RabbitMQ queue:

```typescript
import * as amqp from 'amqplib';

async function setupConsumer() {
  // Connect to RabbitMQ
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await connection.createChannel();
  
  // Setup exchange and queue (should match producer configuration)
  const exchange = process.env.RABBITMQ_EXCHANGE || 'database_events';
  const queue = process.env.RABBITMQ_QUEUE || 'database_changes';
  const routingKey = process.env.RABBITMQ_ROUTING_KEY || 'database.changes';
  
  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, routingKey);
  
  // Consume messages
  channel.consume(queue, (msg) => {
    if (msg) {
      const content = JSON.parse(msg.content.toString());
      console.log(`Received event: ${content.operation} on ${content.table}`);
      
      // Process the message based on table and operation
      if (content.table === 'Clubs') {
        switch (content.operation) {
          case 'INSERT':
            // Handle club creation
            break;
          case 'UPDATE':
            // Handle club update
            break;
          case 'DELETE':
            // Handle club deletion
            break;
        }
      }
      
      // Acknowledge the message
      channel.ack(msg);
    }
  });
  
  console.log('Consumer started');
}

setupConsumer().catch(console.error);
```

## Troubleshooting

If events are not being sent to RabbitMQ:

1. Check the PostgreSQL logs to ensure that the trigger is firing correctly.
2. Verify that the application is successfully connecting to PostgreSQL and RabbitMQ.
3. Check the application logs for any errors related to notification handling or RabbitMQ publishing.
4. Ensure that the table name in the code matches exactly the table name in PostgreSQL (case-sensitive). 