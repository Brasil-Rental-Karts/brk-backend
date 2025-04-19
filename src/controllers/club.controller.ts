import { BaseCrudController } from './base.crud.controller';
import { Club } from '../models/club.entity';
import { ClubService } from '../services/club.service';
import { CreateClubDto, UpdateClubDto } from '../dtos/club.dto';
import { UserRole } from '../models/user.entity';

export class ClubController extends BaseCrudController<Club, CreateClubDto, UpdateClubDto> {
  protected service: ClubService;
  protected createDtoClass = CreateClubDto;
  protected updateDtoClass = UpdateClubDto;
  protected allowedRoles = {
    create: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    read: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER, UserRole.PILOT, UserRole.MEMBER],
    update: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    delete: [UserRole.ADMINISTRATOR]
  };

  constructor(clubService: ClubService) {
    super('/clubs');
    this.service = clubService;
    this.initializeRoutes();
  }

  initializeRoutes(): void {
    this.initializeCrudRoutes();
    // Add custom routes here if needed
  }
}