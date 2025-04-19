import { BaseCrudController } from './base.crud.controller';
import { Penalty } from '../models/penalty.entity';
import { PenaltyService } from '../services/penalty.service';
import { CreatePenaltyDto, UpdatePenaltyDto } from '../dtos/penalty.dto';
import { UserRole } from '../models/user.entity';

export class PenaltyController extends BaseCrudController<Penalty, CreatePenaltyDto, UpdatePenaltyDto> {
  protected service: PenaltyService;
  protected createDtoClass = CreatePenaltyDto;
  protected updateDtoClass = UpdatePenaltyDto;
  protected allowedRoles = {
    create: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    read: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER, UserRole.PILOT, UserRole.MEMBER],
    update: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    delete: [UserRole.ADMINISTRATOR]
  };

  constructor(penaltyService: PenaltyService) {
    super('/penaltys');
    this.service = penaltyService;
    this.initializeRoutes();
  }

  initializeRoutes(): void {
    this.initializeCrudRoutes();
    // Add custom routes here if needed
  }
}