import 'reflect-metadata';
import { App } from './app';
import config from './config/config';
import { HealthController } from './controllers/health.controller';
import { AppDataSource } from './config/database.config';

// Initialize database connection
AppDataSource.initialize()
  .then(() => {
    console.log('Database connection established');
    
    // Initialize controllers
    const controllers = [
      new HealthController(),
      // Add more controllers here as they are created
    ];

    // Initialize the app
    const app = new App(controllers);

    // Start the server
    const PORT: number = Number(config.port) || 3000;
    app.listen(PORT);

    console.log(`Server started on port ${PORT} in ${config.nodeEnv} mode`);
  })
  .catch((error) => {
    console.error('Error during database initialization:', error);
  }); 