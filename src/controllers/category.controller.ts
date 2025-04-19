import { BaseCrudController } from './base.crud.controller';
import { Category } from '../models/category.entity';
import { CategoryService } from '../services/category.service';
import { CreateCategoryDto, UpdateCategoryDto } from '../dtos/category.dto';
import { UserRole } from '../models/user.entity';

export class CategoryController extends BaseCrudController<Category, CreateCategoryDto, UpdateCategoryDto> {
  protected service: CategoryService;
  protected createDtoClass = CreateCategoryDto;
  protected updateDtoClass = UpdateCategoryDto;
  protected allowedRoles = {
    create: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    read: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER, UserRole.PILOT, UserRole.MEMBER],
    update: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    delete: [UserRole.ADMINISTRATOR]
  };

  constructor(categoryService: CategoryService) {
    super('/categorys');
    this.service = categoryService;
    this.initializeRoutes();
  }

  initializeRoutes(): void {
    this.initializeCrudRoutes();
    // Add custom routes here if needed
  }
}