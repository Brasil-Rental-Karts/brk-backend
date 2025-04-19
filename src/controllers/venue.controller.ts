import { BaseCrudController } from './base.crud.controller';
import { Venue } from '../models/venue.entity';
import { VenueService } from '../services/venue.service';
import { CreateVenueDto, UpdateVenueDto } from '../dtos/venue.dto';
import { UserRole } from '../models/user.entity';

export class VenueController extends BaseCrudController<Venue, CreateVenueDto, UpdateVenueDto> {
  protected service: VenueService;
  protected createDtoClass = CreateVenueDto;
  protected updateDtoClass = UpdateVenueDto;
  protected allowedRoles = {
    create: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    read: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER, UserRole.PILOT, UserRole.MEMBER],
    update: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    delete: [UserRole.ADMINISTRATOR]
  };

  constructor(venueService: VenueService) {
    super('/venues');
    this.service = venueService;
    this.initializeRoutes();
  }

  initializeRoutes(): void {
    this.initializeCrudRoutes();
    // Add custom routes here if needed
  }
}