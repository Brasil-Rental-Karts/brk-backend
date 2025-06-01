import 'reflect-metadata';
import { App } from './app';
import config from './config/config';
import { AppDataSource } from './config/database.config';

// Controllers
import { HealthController } from './controllers/health.controller';
import { AuthController } from './controllers/auth.controller';
import { UserController } from './controllers/user.controller';
import { ChampionshipController } from './controllers/championship.controller';
import { MemberProfileController } from './controllers/member-profile.controller';

// Entities
import { User } from './models/user.entity';
import { Championship } from './models/championship.entity';
import { MemberProfile } from './models/member-profile.entity';

// Services
import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';
import { ChampionshipService } from './services/championship.service';
import { RedisService } from './services/redis.service';
import { DatabaseEventsService } from './services/database-events.service';
import { EmailService } from './services/email.service';
import { GoogleAuthService } from './services/google-auth.service';
import { MemberProfileService } from './services/member-profile.service';

// Repositories
import { UserRepository } from './repositories/user.repository';
import { ChampionshipRepository } from './repositories/championship.repository';
import { MemberProfileRepository } from './repositories/member-profile.repository';

// Initialize database connection
AppDataSource.initialize()
  .then(async () => {
    console.log('Database connection established');
    
    // Initialize repositories
    const userRepository = new UserRepository(AppDataSource.getRepository(User));
    const championshipRepository = new ChampionshipRepository(AppDataSource.getRepository(Championship));
    const memberProfileRepository = new MemberProfileRepository(AppDataSource.getRepository(MemberProfile));
    
    // Initialize services
    const emailService = new EmailService();
    const authService = new AuthService(userRepository, memberProfileRepository, emailService);
    const userService = new UserService(userRepository);
    const championshipService = new ChampionshipService(championshipRepository);
    const googleAuthService = new GoogleAuthService(userRepository, memberProfileRepository);
    const memberProfileService = new MemberProfileService(memberProfileRepository);
    
    // Initialize controllers
    const controllers = [
      new HealthController(),
      new AuthController(authService, googleAuthService),
      new UserController(userService),
      new ChampionshipController(championshipService, userService, authService),
      new MemberProfileController(memberProfileService)
    ];

    // Initialize the app
    const app = new App(controllers);

    // Start the server
    const PORT: number = Number(config.port) || 3000;
    app.listen(PORT);

    // Initialize Redis connection
    try {
      // Connect to Redis
      await RedisService.getInstance().connect();
      
      // Start listening for database events
      await DatabaseEventsService.getInstance().startListening();
      
      console.log('Redis and database event listeners initialized');
    } catch (error) {
      console.error('Failed to initialize Redis or database event listeners:', error);
    }

    console.log(`Server started on port ${PORT} in ${config.nodeEnv} mode`);
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down...');
      await DatabaseEventsService.getInstance().stopListening();
      await RedisService.getInstance().close();
      await AppDataSource.destroy();
      process.exit(0);
    });
  })
  .catch((error) => {
    console.error('Error during database initialization:', error);
  }); 