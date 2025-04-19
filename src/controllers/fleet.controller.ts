import { BaseCrudController } from './base.crud.controller';
import { Fleet } from '../models/fleet.entity';
import { FleetService } from '../services/fleet.service';
import { CreateFleetDto, UpdateFleetDto } from '../dtos/fleet.dto';
import { UserRole } from '../models/user.entity';

export class FleetController extends BaseCrudController<Fleet, CreateFleetDto, UpdateFleetDto> {
  protected service: FleetService;
  protected createDtoClass = CreateFleetDto;
  protected updateDtoClass = UpdateFleetDto;
  protected allowedRoles = {
    create: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    read: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER, UserRole.PILOT, UserRole.MEMBER],
    update: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    delete: [UserRole.ADMINISTRATOR]
  };

  constructor(fleetService: FleetService) {
    super('/fleets');
    this.service = fleetService;
    this.initializeRoutes();
  }

  initializeRoutes(): void {
    this.initializeCrudRoutes();
    // Add custom routes here if needed
  }
}