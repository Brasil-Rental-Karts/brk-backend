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
import { SeasonController } from './controllers/season.controller';
import { VipPreregisterController } from './controllers/vip-preregister.controller';
import { CategoryController } from './controllers/category.controller';
import { GridTypeController } from './controllers/grid-type.controller';
import { ScoringSystemController } from './controllers/scoring-system.controller';
import { SeasonRegistrationController } from './controllers/season-registration.controller';
import { AsaasWebhookController } from './controllers/asaas-webhook.controller';
import { StageController } from './controllers/stage.controller';
import { UserStatsController } from './controllers/user-stats.controller';

// Entities
import { User } from './models/user.entity';
import { Championship } from './models/championship.entity';
import { MemberProfile } from './models/member-profile.entity';
import { Season } from './models/season.entity';
import { VipPreregister } from './models/vip-preregister.entity';
import { Category } from './models/category.entity';
import { GridType } from './models/grid-type.entity';

// Services
import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';
import { ChampionshipService } from './services/championship.service';
import { RedisService } from './services/redis.service';
import { DatabaseEventsService } from './services/database-events.service';
import { EmailService } from './services/email.service';
import { GoogleAuthService } from './services/google-auth.service';
import { MemberProfileService } from './services/member-profile.service';
import { SeasonService } from './services/season.service';
import { VipPreregisterService } from './services/vip-preregister.service';
import { CategoryService } from './services/category.service';
import { GridTypeService } from './services/grid-type.service';
import { ScoringSystemService } from './services/scoring-system.service';
import { SeasonRegistrationService } from './services/season-registration.service';
import { AsaasService } from './services/asaas.service';
import { StageService } from './services/stage.service';
import { UserStatsService } from './services/user-stats.service';

// Repositories
import { UserRepository } from './repositories/user.repository';
import { ChampionshipRepository } from './repositories/championship.repository';
import { MemberProfileRepository } from './repositories/member-profile.repository';
import { SeasonRepository } from './repositories/season.repository';
import { VipPreregisterRepository } from './repositories/vip-preregister.repository';
import { CategoryRepository } from './repositories/category.repository';

// Initialize database connection
AppDataSource.initialize()
  .then(async () => {
    console.log('Database connection established');
    
    // Initialize repositories
    const userRepository = new UserRepository(AppDataSource.getRepository(User));
    const championshipRepository = new ChampionshipRepository(AppDataSource.getRepository(Championship));
    const memberProfileRepository = new MemberProfileRepository(AppDataSource.getRepository(MemberProfile));
    const seasonRepository = new SeasonRepository(AppDataSource.getRepository(Season));
    const vipPreregisterRepository = new VipPreregisterRepository(AppDataSource.getRepository(VipPreregister));
    const categoryRepository = new CategoryRepository(AppDataSource.getRepository(Category));
    
    // Initialize services
    const emailService = new EmailService();
    const authService = new AuthService(userRepository, memberProfileRepository, emailService);
    const userService = new UserService(userRepository);
    const championshipService = new ChampionshipService(championshipRepository);
    const googleAuthService = new GoogleAuthService(userRepository, memberProfileRepository);
    const memberProfileService = new MemberProfileService(memberProfileRepository, userService);
    const seasonService = new SeasonService(seasonRepository);
    const vipPreregisterService = new VipPreregisterService(vipPreregisterRepository);
    const categoryService = new CategoryService(categoryRepository);
    const scoringSystemService = new ScoringSystemService();
    const asaasService = new AsaasService();
    const seasonRegistrationService = new SeasonRegistrationService();
    const stageService = new StageService();
    const userStatsService = new UserStatsService();
    
    // Initialize controllers
    const controllers = [
      new HealthController(),
      new AuthController(authService, googleAuthService),
      new UserController(userService),
      new ChampionshipController(championshipService, userService, authService, memberProfileService),
      new MemberProfileController(memberProfileService),
      new SeasonController(seasonService),
      new VipPreregisterController(vipPreregisterService),
      new CategoryController(categoryService),
      new GridTypeController(),
      new ScoringSystemController(scoringSystemService, championshipService),
      new SeasonRegistrationController(seasonRegistrationService),
      new AsaasWebhookController(seasonRegistrationService, asaasService),
      new StageController(stageService),
      new UserStatsController()
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