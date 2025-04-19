import 'reflect-metadata';
import { App } from './app';
import config from './config/config';
import { AppDataSource } from './config/database.config';

// Controllers
import { HealthController } from './controllers/health.controller';
import { AuthController } from './controllers/auth.controller';
import { UserController } from './controllers/user.controller';
import { ChampionshipController } from './controllers/championship.controller';
import { ClubController } from './controllers/club.controller';
import { SeasonController } from './controllers/season.controller';
import { StageController } from './controllers/stage.controller';
import { CategoryController } from './controllers/category.controller';
import { FleetController } from './controllers/fleet.controller';
import { HeatController } from './controllers/heat.controller';
import { PilotController } from './controllers/pilot.controller';
import { ResultController } from './controllers/result.controller';
import { PenaltyController } from './controllers/penalty.controller';
import { OrganizerController } from './controllers/organizer.controller';
import { AdministratorController } from './controllers/administrator.controller';
import { VenueController } from './controllers/venue.controller';
import { KartingTrackController } from './controllers/karting-track.controller';

// Entities
import { User } from './models/user.entity';
import { Championship } from './models/championship.entity';
import { Club } from './models/club.entity';
import { Season } from './models/season.entity';
import { Stage } from './models/stage.entity';
import { Category } from './models/category.entity';
import { Fleet } from './models/fleet.entity';
import { Heat } from './models/heat.entity';
import { Pilot } from './models/pilot.entity';
import { Result } from './models/result.entity';
import { Penalty } from './models/penalty.entity';
import { Organizer } from './models/organizer.entity';
import { Administrator } from './models/administrator.entity';
import { Venue } from './models/venue.entity';
import { KartingTrack } from './models/karting-track.entity';

// Services
import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';
import { ChampionshipService } from './services/championship.service';
import { ClubService } from './services/club.service';
import { SeasonService } from './services/season.service';
import { StageService } from './services/stage.service';
import { CategoryService } from './services/category.service';
import { FleetService } from './services/fleet.service';
import { HeatService } from './services/heat.service';
import { PilotService } from './services/pilot.service';
import { ResultService } from './services/result.service';
import { PenaltyService } from './services/penalty.service';
import { OrganizerService } from './services/organizer.service';
import { AdministratorService } from './services/administrator.service';
import { VenueService } from './services/venue.service';
import { KartingTrackService } from './services/karting-track.service';

// Repositories
import { UserRepository } from './repositories/user.repository';
import { ChampionshipRepository } from './repositories/championship.repository';
import { ClubRepository } from './repositories/club.repository';
import { SeasonRepository } from './repositories/season.repository';
import { StageRepository } from './repositories/stage.repository';
import { CategoryRepository } from './repositories/category.repository';
import { FleetRepository } from './repositories/fleet.repository';
import { HeatRepository } from './repositories/heat.repository';
import { PilotRepository } from './repositories/pilot.repository';
import { ResultRepository } from './repositories/result.repository';
import { PenaltyRepository } from './repositories/penalty.repository';
import { OrganizerRepository } from './repositories/organizer.repository';
import { AdministratorRepository } from './repositories/administrator.repository';
import { VenueRepository } from './repositories/venue.repository';
import { KartingTrackRepository } from './repositories/karting-track.repository';

// Initialize database connection
AppDataSource.initialize()
  .then(() => {
    console.log('Database connection established');
    
    // Initialize repositories
    const userRepository = new UserRepository(AppDataSource.getRepository(User));
    const championshipRepository = new ChampionshipRepository(AppDataSource.getRepository(Championship));
    const clubRepository = new ClubRepository(AppDataSource.getRepository(Club));
    const seasonRepository = new SeasonRepository(AppDataSource.getRepository(Season));
    const stageRepository = new StageRepository(AppDataSource.getRepository(Stage));
    const categoryRepository = new CategoryRepository(AppDataSource.getRepository(Category));
    const fleetRepository = new FleetRepository(AppDataSource.getRepository(Fleet));
    const heatRepository = new HeatRepository(AppDataSource.getRepository(Heat));
    const pilotRepository = new PilotRepository(AppDataSource.getRepository(Pilot));
    const resultRepository = new ResultRepository(AppDataSource.getRepository(Result));
    const penaltyRepository = new PenaltyRepository(AppDataSource.getRepository(Penalty));
    const organizerRepository = new OrganizerRepository(AppDataSource.getRepository(Organizer));
    const administratorRepository = new AdministratorRepository(AppDataSource.getRepository(Administrator));
    const venueRepository = new VenueRepository(AppDataSource.getRepository(Venue));
    const kartingTrackRepository = new KartingTrackRepository(AppDataSource.getRepository(KartingTrack));
    
    // Initialize services
    const authService = new AuthService(userRepository);
    const userService = new UserService(userRepository);
    const championshipService = new ChampionshipService(championshipRepository);
    const clubService = new ClubService(clubRepository);
    const seasonService = new SeasonService(seasonRepository);
    const stageService = new StageService(stageRepository);
    const categoryService = new CategoryService(categoryRepository);
    const fleetService = new FleetService(fleetRepository);
    const heatService = new HeatService(heatRepository);
    const pilotService = new PilotService(pilotRepository);
    const resultService = new ResultService(resultRepository);
    const penaltyService = new PenaltyService(penaltyRepository);
    const organizerService = new OrganizerService(organizerRepository);
    const administratorService = new AdministratorService(administratorRepository);
    const venueService = new VenueService(venueRepository);
    const kartingTrackService = new KartingTrackService(kartingTrackRepository);
    
    // Initialize controllers
    const controllers = [
      new HealthController(),
      new AuthController(authService),
      new UserController(userService),
      new ChampionshipController(championshipService),
      new ClubController(clubService),
      new SeasonController(seasonService),
      new StageController(stageService),
      new CategoryController(categoryService),
      new FleetController(fleetService),
      new HeatController(heatService),
      new PilotController(pilotService),
      new ResultController(resultService),
      new PenaltyController(penaltyService),
      new OrganizerController(organizerService),
      new AdministratorController(administratorService),
      new VenueController(venueService),
      new KartingTrackController(kartingTrackService)
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