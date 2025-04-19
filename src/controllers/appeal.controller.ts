import { BaseCrudController } from './base.crud.controller';
import { Appeal } from '../models/appeal.entity';
import { AppealService } from '../services/appeal.service';
import { CreateAppealDto, UpdateAppealDto } from '../dtos/appeal.dto';
import { UserRole } from '../models/user.entity';

export class AppealController extends BaseCrudController<Appeal, CreateAppealDto, UpdateAppealDto> {
  protected service: AppealService;
  protected createDtoClass = CreateAppealDto;
  protected updateDtoClass = UpdateAppealDto;
  protected allowedRoles = {
    create: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    read: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER, UserRole.PILOT, UserRole.MEMBER],
    update: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    delete: [UserRole.ADMINISTRATOR]
  };

  constructor(appealService: AppealService) {
    super('/appeals');
    this.service = appealService;
    this.initializeRoutes();
  }

  initializeRoutes(): void {
    this.initializeCrudRoutes();
    // Add custom routes here if needed
  }
}