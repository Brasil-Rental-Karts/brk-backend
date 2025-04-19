import { BaseCrudController } from './base.crud.controller';
import { KartingTrack } from '../models/karting-track.entity';
import { KartingTrackService } from '../services/karting-track.service';
import { CreateKartingTrackDto, UpdateKartingTrackDto } from '../dtos/karting-track.dto';
import { UserRole } from '../models/user.entity';

export class KartingTrackController extends BaseCrudController<KartingTrack, CreateKartingTrackDto, UpdateKartingTrackDto> {
  protected service: KartingTrackService;
  protected createDtoClass = CreateKartingTrackDto;
  protected updateDtoClass = UpdateKartingTrackDto;
  protected allowedRoles = {
    create: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    read: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER, UserRole.PILOT, UserRole.MEMBER],
    update: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    delete: [UserRole.ADMINISTRATOR]
  };

  constructor(kartingTrackService: KartingTrackService) {
    super('/kartingTracks');
    this.service = kartingTrackService;
    this.initializeRoutes();
  }

  initializeRoutes(): void {
    this.initializeCrudRoutes();
    // Add custom routes here if needed
  }
}