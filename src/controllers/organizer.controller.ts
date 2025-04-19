import { BaseCrudController } from './base.crud.controller';
import { Organizer } from '../models/organizer.entity';
import { OrganizerService } from '../services/organizer.service';
import { CreateOrganizerDto, UpdateOrganizerDto } from '../dtos/organizer.dto';
import { UserRole } from '../models/user.entity';

export class OrganizerController extends BaseCrudController<Organizer, CreateOrganizerDto, UpdateOrganizerDto> {
  protected service: OrganizerService;
  protected createDtoClass = CreateOrganizerDto;
  protected updateDtoClass = UpdateOrganizerDto;
  protected allowedRoles = {
    create: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    read: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER, UserRole.PILOT, UserRole.MEMBER],
    update: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    delete: [UserRole.ADMINISTRATOR]
  };

  constructor(organizerService: OrganizerService) {
    super('/organizers');
    this.service = organizerService;
    this.initializeRoutes();
  }

  initializeRoutes(): void {
    this.initializeCrudRoutes();
    // Add custom routes here if needed
  }
}