import { AppDataSource } from '../config/database.config';
import { rabbitMQConfig } from '../config/rabbitmq.config';

/**
 * Script to add database event trigger to a new table
 * Usage: ts-node src/scripts/add-table-trigger.ts <TableName>
 */
async function addTableTrigger() {
  // Get table name from command line arguments
  const tableName = process.argv[2];
  
  if (!tableName) {
    console.error('Table name is required. Usage: ts-node src/scripts/add-table-trigger.ts <TableName>');
    process.exit(1);
  }
  
  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('Database connection established');
    
    // Create trigger for the specified table
    await AppDataSource.query(`
      DROP TRIGGER IF EXISTS ${tableName.toLowerCase()}_notify_trigger ON "${tableName}";
      CREATE TRIGGER ${tableName.toLowerCase()}_notify_trigger
      AFTER INSERT OR UPDATE OR DELETE ON "${tableName}"
      FOR EACH ROW EXECUTE FUNCTION notify_rabbitmq();
    `);
    
    console.log(`Trigger created successfully for table ${tableName}`);
    
    // Update tracked tables in configuration
    if (!rabbitMQConfig.trackedTables.includes(tableName)) {
      rabbitMQConfig.trackedTables.push(tableName);
      console.log(`Added ${tableName} to tracked tables in config`);
    }
    
    console.log('Remember to update your rabbitmq.config.ts file to include this table permanently!');
    console.log(`Current tracked tables: ${rabbitMQConfig.trackedTables.join(', ')}`);
    
  } catch (error) {
    console.error('Error adding trigger:', error);
  } finally {
    // Close database connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

// Run the script
addTableTrigger().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 