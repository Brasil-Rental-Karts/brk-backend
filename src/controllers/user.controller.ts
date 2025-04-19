import { BaseCrudController } from './base.crud.controller';
import { User, UserRole } from '../models/user.entity';
import { UserService } from '../services/user.service';
import { CreateUserDto, UpdateUserDto } from '../dtos/user.dto';

export class UserController extends BaseCrudController<User, CreateUserDto, UpdateUserDto> {
  protected service: UserService;
  protected createDtoClass = CreateUserDto;
  protected updateDtoClass = UpdateUserDto;
  protected allowedRoles = {
    create: [UserRole.ADMINISTRATOR],
    read: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    update: [UserRole.ADMINISTRATOR],
    delete: [UserRole.ADMINISTRATOR]
  };

  constructor(userService: UserService) {
    super('/users');
    this.service = userService;
    this.initializeRoutes();
  }

  initializeRoutes(): void {
    this.initializeCrudRoutes();
    // Additional custom routes can be added here
  }
} 