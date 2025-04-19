import 'reflect-metadata';
import { App } from './app';
import config from './config/config';
import { AppDataSource } from './config/database.config';

// Controllers
import { HealthController } from './controllers/health.controller';
import { AuthController } from './controllers/auth.controller';
import { UserController } from './controllers/user.controller';
import { ClubController } from './controllers/club.controller';

// Entities
import { User } from './models/user.entity';
import { Club } from './models/club.entity';

// Services
import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';
import { ClubService } from './services/club.service';

// Repositories
import { UserRepository } from './repositories/user.repository';
import { ClubRepository } from './repositories/club.repository';

// Initialize database connection
AppDataSource.initialize()
  .then(() => {
    console.log('Database connection established');
    
    // Initialize repositories
    const userRepository = new UserRepository(AppDataSource.getRepository(User));
    const clubRepository = new ClubRepository(AppDataSource.getRepository(Club));
    
    // Initialize services
    const authService = new AuthService(userRepository);
    const userService = new UserService(userRepository);
    const clubService = new ClubService(clubRepository);
    
    // Initialize controllers
    const controllers = [
      new HealthController(),
      new AuthController(authService),
      new UserController(userService),
      new ClubController(clubService)
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