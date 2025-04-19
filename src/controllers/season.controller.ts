import { BaseCrudController } from './base.crud.controller';
import { Season } from '../models/season.entity';
import { SeasonService } from '../services/season.service';
import { CreateSeasonDto, UpdateSeasonDto } from '../dtos/season.dto';
import { UserRole } from '../models/user.entity';

export class SeasonController extends BaseCrudController<Season, CreateSeasonDto, UpdateSeasonDto> {
  protected service: SeasonService;
  protected createDtoClass = CreateSeasonDto;
  protected updateDtoClass = UpdateSeasonDto;
  protected allowedRoles = {
    create: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    read: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER, UserRole.PILOT, UserRole.MEMBER],
    update: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    delete: [UserRole.ADMINISTRATOR]
  };

  constructor(seasonService: SeasonService) {
    super('/seasons');
    this.service = seasonService;
    this.initializeRoutes();
  }

  initializeRoutes(): void {
    this.initializeCrudRoutes();
    // Add custom routes here if needed
  }
}