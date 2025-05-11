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

## RabbitMQ Architecture

The system is configured with a robust setup including dead letter handling:

1. **Main Exchange (`database_events`)**: A topic exchange where all database events are published.
2. **Main Queue (`database_changes`)**: The primary queue that consumers should subscribe to.
3. **Dead Letter Exchange (`database_events.dlx`)**: Exchange for messages that are rejected or expire.
4. **Dead Letter Queue (`database_changes.dlq`)**: Queue for storing rejected or expired messages.
5. **Dead Letter Routing Key (`database.changes.dlq`)**: Specific routing key for messages going to the dead letter queue.

This architecture allows for:
- Reliable message delivery
- Handling of failed message processing
- Monitoring of problematic messages in the dead letter queue
- Specific routing of dead letter messages

## Message Flow

1. Normal flow:
   - Message published to `database_events` exchange with routing key `database.changes`
   - Message routed to `database_changes` queue
   - Consumer processes message and acknowledges it

2. Error flow:
   - Consumer rejects message or message expires
   - Message sent to `database_events.dlx` exchange with routing key `database.changes.dlq`
   - Message routed to `database_changes.dlq` queue
   - DLQ processor can handle these failed messages

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
  
  // Setup dead letter configuration
  const dlxName = `${exchange}.dlx`;
  const dlRoutingKey = `${routingKey}.dlq`;
  
  // Declare the main exchange
  await channel.assertExchange(exchange, 'topic', { durable: true });
  
  // Declare the queue with dead letter configuration
  await channel.assertQueue(queue, { 
    durable: true,
    arguments: {
      'x-dead-letter-exchange': dlxName,
      'x-dead-letter-routing-key': dlRoutingKey
    }
  });
  
  // Bind queue to exchange
  await channel.bindQueue(queue, exchange, routingKey);
  
  // Consume messages
  channel.consume(queue, (msg) => {
    if (msg) {
      try {
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
        
        // Acknowledge the message if processed successfully
        channel.ack(msg);
      } catch (error) {
        // Reject the message and send to dead letter queue if processing fails
        console.error('Error processing message:', error);
        channel.reject(msg, false);
      }
    }
  }, { noAck: false }); // Important: set noAck to false to enable manual acknowledgment
  
  console.log('Consumer started');
}

setupConsumer().catch(console.error);
```

## Dead Letter Queue Handling

Messages can end up in the dead letter queue (`database_changes.dlq`) for several reasons:
- Processing errors (rejected messages)
- Message expiration (TTL)
- Queue length limits exceeded

To process messages from the dead letter queue:

```typescript
async function processDLQ() {
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await connection.createChannel();
  
  // DLQ configuration
  const exchange = process.env.RABBITMQ_EXCHANGE || 'database_events';
  const dlxName = `${exchange}.dlx`;
  const dlqName = 'database_changes.dlq';
  const dlRoutingKey = `${process.env.RABBITMQ_ROUTING_KEY || 'database.changes'}.dlq`;
  
  // Setup DLX and DLQ
  await channel.assertExchange(dlxName, 'topic', { durable: true });
  await channel.assertQueue(dlqName, { durable: true });
  await channel.bindQueue(dlqName, dlxName, dlRoutingKey);
  
  // Consume messages from DLQ
  channel.consume(dlqName, async (msg) => {
    if (msg) {
      try {
        const content = JSON.parse(msg.content.toString());
        console.log(`Processing failed message from DLQ: ${content.operation} on ${content.table}`);
        
        // Special handling for failed messages
        // ...
        
        // Acknowledge the message
        channel.ack(msg);
      } catch (error) {
        console.error('Error processing DLQ message:', error);
        // You might want to move to a "parking lot" or log for manual intervention
        channel.ack(msg);
      }
    }
  }, { noAck: false });
  
  console.log('DLQ consumer started');
}
```

## Troubleshooting

If events are not being sent to RabbitMQ:

1. Check the PostgreSQL logs to ensure that the trigger is firing correctly.
2. Verify that the application is successfully connecting to PostgreSQL and RabbitMQ.
3. Check the application logs for any errors related to notification handling or RabbitMQ publishing.
4. Ensure that the table name in the code matches exactly the table name in PostgreSQL (case-sensitive).
5. Examine the RabbitMQ management interface (http://localhost:15672 with default credentials guest/guest) to verify queue and exchange configuration.
6. Check the dead letter queue for rejected messages.

### Queue Declaration Issues

If you encounter errors like `PRECONDITION_FAILED - inequivalent arg 'x-dead-letter-exchange'` or `'x-dead-letter-routing-key'`, it means that:

1. The queue already exists in RabbitMQ with certain parameters
2. Your application is trying to declare the same queue with different parameters

To fix this, ensure your queue declaration matches the existing queue configuration:

- Check the RabbitMQ Admin UI for the existing queue parameters
- Update your code to match these parameters exactly
- Consider deleting the queue through the RabbitMQ Admin UI if you need to change its configuration (make sure no important messages are lost) 