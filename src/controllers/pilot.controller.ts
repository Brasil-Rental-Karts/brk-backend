import { BaseCrudController } from './base.crud.controller';
import { Pilot } from '../models/pilot.entity';
import { PilotService } from '../services/pilot.service';
import { CreatePilotDto, UpdatePilotDto } from '../dtos/pilot.dto';
import { UserRole } from '../models/user.entity';

export class PilotController extends BaseCrudController<Pilot, CreatePilotDto, UpdatePilotDto> {
  protected service: PilotService;
  protected createDtoClass = CreatePilotDto;
  protected updateDtoClass = UpdatePilotDto;
  protected allowedRoles = {
    create: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    read: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER, UserRole.PILOT, UserRole.MEMBER],
    update: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    delete: [UserRole.ADMINISTRATOR]
  };

  constructor(pilotService: PilotService) {
    super('/pilots');
    this.service = pilotService;
    this.initializeRoutes();
  }

  initializeRoutes(): void {
    this.initializeCrudRoutes();
    // Add custom routes here if needed
  }
}