import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { BaseService } from '../services/base.service';
import { BaseDto } from '../dtos/base.dto';
import { validationMiddleware } from '../middleware/validator.middleware';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';
import { UserRole } from '../models/user.entity';

export abstract class BaseCrudController<T, CreateDto extends BaseDto, UpdateDto extends BaseDto> extends BaseController {
  protected abstract service: BaseService<T>;
  protected abstract createDtoClass: new () => CreateDto;
  protected abstract updateDtoClass: new () => UpdateDto;
  protected abstract allowedRoles: {
    create: UserRole[];
    read: UserRole[];
    update: UserRole[];
    delete: UserRole[];
  };

  constructor(path: string) {
    super(path);
  }

  protected initializeCrudRoutes(): void {
    // CREATE
    this.router.post(
      '/',
      authMiddleware,
      roleMiddleware(this.allowedRoles.create),
      validationMiddleware(this.createDtoClass),
      this.create.bind(this)
    );

    // READ ALL
    this.router.get(
      '/',
      authMiddleware,
      roleMiddleware(this.allowedRoles.read),
      this.getAll.bind(this)
    );

    // READ ONE
    this.router.get(
      '/:id',
      authMiddleware,
      roleMiddleware(this.allowedRoles.read),
      this.getById.bind(this)
    );

    // UPDATE
    this.router.put(
      '/:id',
      authMiddleware,
      roleMiddleware(this.allowedRoles.update),
      validationMiddleware(this.updateDtoClass),
      this.update.bind(this)
    );

    // DELETE
    this.router.delete(
      '/:id',
      authMiddleware,
      roleMiddleware(this.allowedRoles.delete),
      this.delete.bind(this)
    );
  }

  protected async create(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.service.create(req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error(`Error creating resource: ${error}`);
      res.status(500).json({ message: 'Failed to create resource' });
    }
  }

  protected async getAll(req: Request, res: Response): Promise<void> {
    try {
      const items = await this.service.findAll();
      res.status(200).json(items);
    } catch (error) {
      console.error(`Error retrieving resources: ${error}`);
      res.status(500).json({ message: 'Failed to retrieve resources' });
    }
  }

  protected async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const item = await this.service.findById(id);
      
      if (!item) {
        res.status(404).json({ message: 'Resource not found' });
        return;
      }
      
      res.status(200).json(item);
    } catch (error) {
      console.error(`Error retrieving resource: ${error}`);
      res.status(500).json({ message: 'Failed to retrieve resource' });
    }
  }

  protected async update(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const updatedItem = await this.service.update(id, req.body);
      
      if (!updatedItem) {
        res.status(404).json({ message: 'Resource not found' });
        return;
      }
      
      res.status(200).json(updatedItem);
    } catch (error) {
      console.error(`Error updating resource: ${error}`);
      res.status(500).json({ message: 'Failed to update resource' });
    }
  }

  protected async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const success = await this.service.delete(id);
      
      if (!success) {
        res.status(404).json({ message: 'Resource not found' });
        return;
      }
      
      res.status(204).send();
    } catch (error) {
      console.error(`Error deleting resource: ${error}`);
      res.status(500).json({ message: 'Failed to delete resource' });
    }
  }
} 