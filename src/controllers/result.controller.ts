import { BaseCrudController } from './base.crud.controller';
import { Result } from '../models/result.entity';
import { ResultService } from '../services/result.service';
import { CreateResultDto, UpdateResultDto } from '../dtos/result.dto';
import { UserRole } from '../models/user.entity';

export class ResultController extends BaseCrudController<Result, CreateResultDto, UpdateResultDto> {
  protected service: ResultService;
  protected createDtoClass = CreateResultDto;
  protected updateDtoClass = UpdateResultDto;
  protected allowedRoles = {
    create: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    read: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER, UserRole.PILOT, UserRole.MEMBER],
    update: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    delete: [UserRole.ADMINISTRATOR]
  };

  constructor(resultService: ResultService) {
    super('/results');
    this.service = resultService;
    this.initializeRoutes();
  }

  initializeRoutes(): void {
    this.initializeCrudRoutes();
    // Add custom routes here if needed
  }
}