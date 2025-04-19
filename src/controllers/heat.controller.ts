import { BaseCrudController } from './base.crud.controller';
import { Heat } from '../models/heat.entity';
import { HeatService } from '../services/heat.service';
import { CreateHeatDto, UpdateHeatDto } from '../dtos/heat.dto';
import { UserRole } from '../models/user.entity';

export class HeatController extends BaseCrudController<Heat, CreateHeatDto, UpdateHeatDto> {
  protected service: HeatService;
  protected createDtoClass = CreateHeatDto;
  protected updateDtoClass = UpdateHeatDto;
  protected allowedRoles = {
    create: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    read: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER, UserRole.PILOT, UserRole.MEMBER],
    update: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    delete: [UserRole.ADMINISTRATOR]
  };

  constructor(heatService: HeatService) {
    super('/heats');
    this.service = heatService;
    this.initializeRoutes();
  }

  initializeRoutes(): void {
    this.initializeCrudRoutes();
    // Add custom routes here if needed
  }
}