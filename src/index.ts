import 'reflect-metadata';
import { App } from './app';
import config from './config/config';
import { AppDataSource } from './config/database.config';

// Controllers
import { HealthController } from './controllers/health.controller';
import { AuthController } from './controllers/auth.controller';
import { UserController } from './controllers/user.controller';
import { ClubController } from './controllers/club.controller';
import { MemberProfileController } from './controllers/member-profile.controller';

// Entities
import { User } from './models/user.entity';
import { Club } from './models/club.entity';
import { MemberProfile } from './models/member-profile.entity';

// Services
import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';
import { ClubService } from './services/club.service';
import { RabbitMQService } from './services/rabbitmq.service';
import { DatabaseEventsService } from './services/database-events.service';
import { EmailService } from './services/email.service';
import { GoogleAuthService } from './services/google-auth.service';
import { MemberProfileService } from './services/member-profile.service';

// Repositories
import { UserRepository } from './repositories/user.repository';
import { ClubRepository } from './repositories/club.repository';
import { MemberProfileRepository } from './repositories/member-profile.repository';

// Initialize database connection
AppDataSource.initialize()
  .then(async () => {
    console.log('Database connection established');
    
    // Initialize repositories
    const userRepository = new UserRepository(AppDataSource.getRepository(User));
    const clubRepository = new ClubRepository(AppDataSource.getRepository(Club));
    const memberProfileRepository = new MemberProfileRepository(AppDataSource.getRepository(MemberProfile));
    
    // Initialize services
    const emailService = new EmailService();
    const authService = new AuthService(userRepository, memberProfileRepository, emailService);
    const userService = new UserService(userRepository);
    const clubService = new ClubService(clubRepository);
    const googleAuthService = new GoogleAuthService(userRepository, memberProfileRepository);
    const memberProfileService = new MemberProfileService(memberProfileRepository);
    
    // Set up service relationships
    clubService.setUserService(userService);
    
    // Initialize controllers
    const controllers = [
      new HealthController(),
      new AuthController(authService, googleAuthService),
      new UserController(userService),
      new ClubController(clubService, userService, authService),
      new MemberProfileController(memberProfileService)
    ];

    // Initialize the app
    const app = new App(controllers);

    // Start the server
    const PORT: number = Number(config.port) || 3000;
    app.listen(PORT);

    // Initialize RabbitMQ connection
    try {
      // Connect to RabbitMQ
      await RabbitMQService.getInstance().connect();
      
      // Start listening for database events
      await DatabaseEventsService.getInstance().startListening();
      
      console.log('RabbitMQ and database event listeners initialized');
    } catch (error) {
      console.error('Failed to initialize RabbitMQ or database event listeners:', error);
    }

    console.log(`Server started on port ${PORT} in ${config.nodeEnv} mode`);
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down...');
      await DatabaseEventsService.getInstance().stopListening();
      await RabbitMQService.getInstance().close();
      await AppDataSource.destroy();
      process.exit(0);
    });
  })
  .catch((error) => {
    console.error('Error during database initialization:', error);
  }); 