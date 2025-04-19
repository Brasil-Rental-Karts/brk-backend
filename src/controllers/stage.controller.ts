import { BaseCrudController } from './base.crud.controller';
import { Stage } from '../models/stage.entity';
import { StageService } from '../services/stage.service';
import { CreateStageDto, UpdateStageDto } from '../dtos/stage.dto';
import { UserRole } from '../models/user.entity';

export class StageController extends BaseCrudController<Stage, CreateStageDto, UpdateStageDto> {
  protected service: StageService;
  protected createDtoClass = CreateStageDto;
  protected updateDtoClass = UpdateStageDto;
  protected allowedRoles = {
    create: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    read: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER, UserRole.PILOT, UserRole.MEMBER],
    update: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    delete: [UserRole.ADMINISTRATOR]
  };

  constructor(stageService: StageService) {
    super('/stages');
    this.service = stageService;
    this.initializeRoutes();
  }

  initializeRoutes(): void {
    this.initializeCrudRoutes();
    // Add custom routes here if needed
  }
}