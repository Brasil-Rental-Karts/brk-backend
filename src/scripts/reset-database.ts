import { DataSource } from 'typeorm';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function resetDatabase() {
  console.log('Initializing database connection...');
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'brk_competition',
    synchronize: false,
    logging: true,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  
  try {
    await dataSource.initialize();
    console.log('Database connection established.');
    
    console.log('Dropping all tables...');
    
    // Get all tables in the public schema
    const tables = await dataSource.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public';
    `);
    
    if (tables.length > 0) {
      // Start a transaction
      await dataSource.query('BEGIN');
      
      // Disable foreign key constraints temporarily
      await dataSource.query('SET CONSTRAINTS ALL DEFERRED');
      
      // Drop all tables
      for (const table of tables) {
        console.log(`Dropping table ${table.tablename}...`);
        await dataSource.query(`DROP TABLE IF EXISTS "${table.tablename}" CASCADE`);
      }
      
      // Drop all enums
      const enums = await dataSource.query(`
        SELECT typname FROM pg_type 
        JOIN pg_catalog.pg_namespace ON pg_namespace.oid = pg_type.typnamespace
        WHERE typcategory = 'E' AND nspname = 'public';
      `);
      
      for (const enumType of enums) {
        console.log(`Dropping enum ${enumType.typname}...`);
        await dataSource.query(`DROP TYPE IF EXISTS "${enumType.typname}" CASCADE`);
      }
      
      // Clear migration table if it exists
      console.log('Clearing migrations table if it exists...');
      await dataSource.query(`DROP TABLE IF EXISTS "typeorm_metadata" CASCADE`);
      await dataSource.query(`DROP TABLE IF EXISTS "migrations" CASCADE`);
      
      // Commit transaction
      await dataSource.query('COMMIT');
      console.log('All tables and enums dropped successfully.');
    } else {
      console.log('No tables found to drop.');
    }
  } catch (error) {
    console.error('Error during database reset:', error);
    // Roll back transaction if there's an error
    try {
      await dataSource.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Error during rollback:', rollbackError);
    }
  } finally {
    // Close the connection
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('Database connection closed.');
    }
  }
}

// Run the reset function
resetDatabase()
  .then(() => {
    console.log('Database reset completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database reset failed:', error);
    process.exit(1);
  }); 