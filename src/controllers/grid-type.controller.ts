import { Router, Request, Response } from 'express';
import { BaseController } from './base.controller';
import { GridTypeService } from '../services/grid-type.service';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';
import { validationMiddleware } from '../middleware/validator.middleware';
import { CreateGridTypeDto, UpdateGridTypeDto } from '../dtos/grid-type.dto';
import { UserRole } from '../models/user.entity';

export class GridTypeController extends BaseController {
  private gridTypeService: GridTypeService;

  constructor() {
    super('/');
    this.gridTypeService = new GridTypeService();
    this.initializeRoutes();
  }

  initializeRoutes(): void {
    this.router.get('/championships/:championshipId/grid-types', authMiddleware, this.getByChampionship.bind(this));
    this.router.post('/championships/:championshipId/grid-types/predefined', authMiddleware, this.createPredefined.bind(this));
    this.router.post('/championships/:championshipId/grid-types', authMiddleware, validationMiddleware(CreateGridTypeDto), this.create.bind(this));
    this.router.put('/championships/:championshipId/grid-types/:id', authMiddleware, validationMiddleware(UpdateGridTypeDto), this.update.bind(this));
    this.router.delete('/championships/:championshipId/grid-types/:id', authMiddleware, this.delete.bind(this));
    this.router.patch('/championships/:championshipId/grid-types/:id/toggle-active', authMiddleware, this.activate.bind(this));
    this.router.patch('/championships/:championshipId/grid-types/:id/set-default', authMiddleware, this.setAsDefault.bind(this));
  }

  private async getByChampionship(req: Request, res: Response): Promise<void> {
    try {
      const { championshipId } = req.params;
      const gridTypes = await this.gridTypeService.findByChampionship(championshipId);
      res.json(gridTypes);
    } catch (error: any) {
      console.error('Error getting grid types:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async createPredefined(req: Request, res: Response): Promise<void> {
    try {
      const { championshipId } = req.params;
      const gridTypes = await this.gridTypeService.createPredefined(championshipId);
      res.status(201).json(gridTypes);
    } catch (error: any) {
      console.error('Error creating predefined grid types:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async create(req: Request, res: Response): Promise<void> {
    try {
      const { championshipId } = req.params;
      const createDto: CreateGridTypeDto = req.body;
      const gridType = await this.gridTypeService.create(championshipId, createDto);
      res.status(201).json(gridType);
    } catch (error: any) {
      console.error('Error creating grid type:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async update(req: Request, res: Response): Promise<void> {
    try {
      const { id, championshipId } = req.params;
      const updateDto: UpdateGridTypeDto = req.body;
      const gridType = await this.gridTypeService.update(id, championshipId, updateDto);
      res.json(gridType);
    } catch (error: any) {
      console.error('Error updating grid type:', error);
      if (error.message === 'Tipo de grid não encontrado') {
        res.status(404).json({ message: 'Tipo de grid não encontrado' });
      } else {
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }

  private async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id, championshipId } = req.params;
      await this.gridTypeService.delete(id, championshipId);
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting grid type:', error);
      
      if (error.message === 'Tipo de grid não encontrado') {
        res.status(404).json({ message: 'Tipo de grid não encontrado' });
      } else if (error.message === 'Não é possível excluir o único tipo de grid. Pelo menos um tipo deve existir.') {
        res.status(400).json({ message: error.message });
      } else if (error.message === 'Não é possível excluir o último tipo de grid ativo') {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }

  private async activate(req: Request, res: Response): Promise<void> {
    try {
      const { id, championshipId } = req.params;
      const gridType = await this.gridTypeService.toggleActive(id, championshipId);
      res.json(gridType);
    } catch (error: any) {
      console.error('Error activating grid type:', error);
      
      if (error.message === 'Tipo de grid não encontrado') {
        res.status(404).json({ message: 'Tipo de grid não encontrado' });
      } else if (error.message === 'Não é possível desativar o último tipo de grid ativo') {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }

  private async setAsDefault(req: Request, res: Response): Promise<void> {
    try {
      const { id, championshipId } = req.params;
      const gridType = await this.gridTypeService.setAsDefault(id, championshipId);
      res.json(gridType);
    } catch (error: any) {
      console.error('Error setting grid type as default:', error);
      
      if (error.message === 'Tipo de grid não encontrado') {
        res.status(404).json({ message: 'Tipo de grid não encontrado' });
      } else if (error.message === 'Não é possível definir um tipo de grid inativo como padrão') {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }
} 