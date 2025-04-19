import { BaseCrudController } from './base.crud.controller';
import { Administrator } from '../models/administrator.entity';
import { AdministratorService } from '../services/administrator.service';
import { CreateAdministratorDto, UpdateAdministratorDto } from '../dtos/administrator.dto';
import { UserRole } from '../models/user.entity';

export class AdministratorController extends BaseCrudController<Administrator, CreateAdministratorDto, UpdateAdministratorDto> {
  protected service: AdministratorService;
  protected createDtoClass = CreateAdministratorDto;
  protected updateDtoClass = UpdateAdministratorDto;
  protected allowedRoles = {
    create: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    read: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER, UserRole.PILOT, UserRole.MEMBER],
    update: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    delete: [UserRole.ADMINISTRATOR]
  };

  constructor(administratorService: AdministratorService) {
    super('/administrators');
    this.service = administratorService;
    this.initializeRoutes();
  }

  initializeRoutes(): void {
    this.initializeCrudRoutes();
    // Add custom routes here if needed
  }
}