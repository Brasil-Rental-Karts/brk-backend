import 'reflect-metadata';

import { App } from './app';
import config from './config/config';
import { AppDataSource } from './config/database.config';
import { initSentry } from './config/sentry.config';
import { setupSentryErrorHandlers } from './utils/sentry.util';
import { AdminStatsController } from './controllers/admin-stats.controller';
import { AsaasWebhookController } from './controllers/asaas-webhook.controller';
import { AuthController } from './controllers/auth.controller';
import { CategoryController } from './controllers/category.controller';
import { ChampionshipController } from './controllers/championship.controller';
import { ChampionshipClassificationController } from './controllers/championship-classification.controller';
import { ChampionshipStaffController } from './controllers/championship-staff.controller';
import { CreditCardFeesController } from './controllers/credit-card-fees.controller';
import { GridTypeController } from './controllers/grid-type.controller';
// Controllers
import { HealthController } from './controllers/health.controller';
import { LapTimesController } from './controllers/lap-times.controller';
import { MemberProfileController } from './controllers/member-profile.controller';
import { PaymentManagementController } from './controllers/payment-management.controller';
import { PenaltyController } from './controllers/penalty.controller';
import { RaceTrackController } from './controllers/race-track.controller';
import { RegulationController } from './controllers/regulation.controller';
import { ScoringSystemController } from './controllers/scoring-system.controller';
import { SeasonController } from './controllers/season.controller';
import { SeasonRegistrationController } from './controllers/season-registration.controller';
import { StageController } from './controllers/stage.controller';
import { StageParticipationController } from './controllers/stage-participation.controller';
import { UserController } from './controllers/user.controller';
import { UserStatsController } from './controllers/user-stats.controller';
import { ShortioController } from './controllers/shortio.controller';
import { Category } from './models/category.entity';
import { Championship } from './models/championship.entity';
import { ChampionshipStaff } from './models/championship-staff.entity';
import { MemberProfile } from './models/member-profile.entity';
import { Penalty } from './models/penalty.entity';
import { RaceTrack } from './models/race-track.entity';
import { Regulation } from './models/regulation.entity';
import { Season } from './models/season.entity';
// Entities
import { User } from './models/user.entity';
import { CategoryRepository } from './repositories/category.repository';
import { ChampionshipRepository } from './repositories/championship.repository';
import { ChampionshipStaffRepository } from './repositories/championship-staff.repository';
import { MemberProfileRepository } from './repositories/member-profile.repository';
import { PenaltyRepositoryImpl } from './repositories/penalty.repository.impl';
import { RaceTrackRepository } from './repositories/race-track.repository';
import { RegulationRepositoryImpl } from './repositories/regulation.repository';
import { SeasonRepository } from './repositories/season.repository';
// Repositories
import { UserRepository } from './repositories/user.repository';
import { AsaasService } from './services/asaas.service';
// Services
import { AuthService } from './services/auth.service';
import { CategoryService } from './services/category.service';
import { ChampionshipService } from './services/championship.service';
import { ChampionshipStaffService } from './services/championship-staff.service';
import { CreditCardFeesService } from './services/credit-card-fees.service';
import { DatabaseEventsService } from './services/database-events.service';
import { EmailService } from './services/email.service';
import { GoogleAuthService } from './services/google-auth.service';
import { MemberProfileService } from './services/member-profile.service';
import { PenaltyService } from './services/penalty.service';
import { RaceTrackService } from './services/race-track.service';
import { RedisService } from './services/redis.service';
import { RegulationService } from './services/regulation.service';
import { ScoringSystemService } from './services/scoring-system.service';
import { SeasonService } from './services/season.service';
import { SeasonRegistrationService } from './services/season-registration.service';
import { StageService } from './services/stage.service';
import { StageParticipationService } from './services/stage-participation.service';
import { UserService } from './services/user.service';
import { UserStatsService } from './services/user-stats.service';

// Initialize Sentry
initSentry();

// Setup Sentry error handlers
setupSentryErrorHandlers();

// Initialize database connection
AppDataSource.initialize()
  .then(async () => {
    // Initialize repositories
    const userRepository = new UserRepository(
      AppDataSource.getRepository(User)
    );
    const championshipRepository = new ChampionshipRepository(
      AppDataSource.getRepository(Championship)
    );
    const championshipStaffRepository = new ChampionshipStaffRepository(
      AppDataSource.getRepository(ChampionshipStaff)
    );
    const memberProfileRepository = new MemberProfileRepository(
      AppDataSource.getRepository(MemberProfile)
    );
    const seasonRepository = new SeasonRepository(
      AppDataSource.getRepository(Season)
    );

    const categoryRepository = new CategoryRepository(
      AppDataSource.getRepository(Category)
    );
    const regulationRepository = new RegulationRepositoryImpl(
      AppDataSource.getRepository(Regulation)
    );
    const raceTrackRepository = new RaceTrackRepository(
      AppDataSource.getRepository(RaceTrack)
    );
    const penaltyRepository = new PenaltyRepositoryImpl(
      AppDataSource.getRepository(Penalty)
    );

    // Initialize services
    const emailService = new EmailService();
    const authService = new AuthService(
      userRepository,
      memberProfileRepository,
      emailService
    );
    const userService = new UserService(
      userRepository,
      memberProfileRepository
    );
    const championshipService = new ChampionshipService(championshipRepository);
    const championshipStaffService = new ChampionshipStaffService(
      championshipStaffRepository,
      userService,
      championshipService
    );
    const googleAuthService = new GoogleAuthService(
      userRepository,
      memberProfileRepository
    );
    const memberProfileService = new MemberProfileService(
      memberProfileRepository,
      userService
    );
    const seasonService = new SeasonService(seasonRepository);
    const stageService = new StageService();
    const categoryService = new CategoryService(
      categoryRepository,
      seasonService,
      stageService
    );
    const scoringSystemService = new ScoringSystemService();
    const asaasService = new AsaasService();
    const seasonRegistrationService = new SeasonRegistrationService();
    const stageParticipationService = new StageParticipationService();
    const userStatsService = new UserStatsService();
    const regulationService = new RegulationService(regulationRepository);
    const raceTrackService = new RaceTrackService(raceTrackRepository);
    const creditCardFeesService = new CreditCardFeesService();
    const penaltyService = new PenaltyService(penaltyRepository);

    // Initialize controllers
    const controllers = [
      new HealthController(),
      new AuthController(authService, googleAuthService),
      new UserController(userService),
      new ChampionshipController(
        championshipService,
        userService,
        authService,
        memberProfileService,
        championshipStaffService,
        seasonRegistrationService
      ),
      new ChampionshipStaffController(championshipStaffService),
      new MemberProfileController(memberProfileService),
      new SeasonController(
        seasonService,
        championshipStaffService,
        championshipService
      ),

      new CategoryController(
        categoryService,
        championshipStaffService,
        seasonService
      ),
      new GridTypeController(championshipStaffService),
      new ScoringSystemController(
        scoringSystemService,
        championshipService,
        championshipStaffService
      ),
      new SeasonRegistrationController(
        seasonRegistrationService,
        championshipStaffService,
        seasonService
      ),
      new AsaasWebhookController(seasonRegistrationService, asaasService),
      new StageController(
        stageService,
        championshipStaffService,
        seasonService
      ),
      new StageParticipationController(),
      new UserStatsController(),
      new RegulationController(
        regulationService,
        championshipStaffService,
        seasonService
      ),
      new AdminStatsController(),
      new RaceTrackController(raceTrackService),
      new LapTimesController(AppDataSource),
      new ChampionshipClassificationController(),
      new CreditCardFeesController(),
      new PaymentManagementController(seasonRegistrationService),
      new PenaltyController(penaltyService),
      new ShortioController(),
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
    } catch (error) {
      console.error(
        'Failed to initialize Redis or database event listeners:',
        error
      );
    }

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      // Graceful shutdown
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
      process.exit(0);
    });
  })
  .catch(error => {
    console.error('Error during database initialization:', error);
  });
