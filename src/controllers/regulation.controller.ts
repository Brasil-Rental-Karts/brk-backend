import { Router, Request, Response } from 'express';
import { BaseController } from './base.controller';
import { RegulationService } from '../services/regulation.service';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';
import { UserRole } from '../models/user.entity';
import { validationMiddleware } from '../middleware/validator.middleware';
import { 
  CreateRegulationDto, 
  UpdateRegulationDto, 
  ReorderSectionsDto
} from '../dtos/regulation.dto';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { NotFoundException } from '../exceptions/not-found.exception';

export class RegulationController extends BaseController {
  constructor(private regulationService: RegulationService) {
    super('/regulations');
    this.initializeRoutes();
  }

  public initializeRoutes(): void {
    this.router.get('/season/:seasonId', authMiddleware, this.getRegulationBySeasonId.bind(this));
    this.router.get('/season/:seasonId/published', this.getPublishedRegulationBySeasonId.bind(this));
    this.router.get('/:id', authMiddleware, this.getRegulationById.bind(this));
    
    this.router.post(
      '/',
      authMiddleware,
      roleMiddleware([UserRole.MANAGER, UserRole.ADMINISTRATOR]),
      validationMiddleware(CreateRegulationDto),
      this.createRegulation.bind(this)
    );

    this.router.put(
      '/:id',
      authMiddleware,
      roleMiddleware([UserRole.MANAGER, UserRole.ADMINISTRATOR]),
      validationMiddleware(UpdateRegulationDto),
      this.updateRegulation.bind(this)
    );

    this.router.post(
      '/:id/publish',
      authMiddleware,
      roleMiddleware([UserRole.MANAGER, UserRole.ADMINISTRATOR]),
      this.publishRegulation.bind(this)
    );

    this.router.post(
      '/:id/sections/reorder',
      authMiddleware,
      roleMiddleware([UserRole.MANAGER, UserRole.ADMINISTRATOR]),
      validationMiddleware(ReorderSectionsDto),
      this.reorderSections.bind(this)
    );

    this.router.delete(
      '/:id',
      authMiddleware,
      roleMiddleware([UserRole.MANAGER, UserRole.ADMINISTRATOR]),
      this.deleteRegulation.bind(this)
    );
  }

  private async getRegulationBySeasonId(req: Request, res: Response): Promise<void> {
    const { seasonId } = req.params;

    if (!seasonId) {
      throw new BadRequestException('Season ID is required');
    }

    const regulation = await this.regulationService.findBySeasonId(seasonId);
    
    if (!regulation) {
      throw new NotFoundException('Regulation not found');
    }

    res.json(regulation);
  }

  private async getPublishedRegulationBySeasonId(req: Request, res: Response): Promise<void> {
    const { seasonId } = req.params;

    if (!seasonId) {
      throw new BadRequestException('Season ID is required');
    }

    const regulation = await this.regulationService.findPublishedBySeasonId(seasonId);
    
    if (!regulation) {
      throw new NotFoundException('Published regulation not found');
    }

    res.json(regulation);
  }

  private async getRegulationById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id) {
      throw new BadRequestException('Regulation ID is required');
    }

    const regulation = await this.regulationService.findByIdWithSections(id);
    
    if (!regulation) {
      throw new NotFoundException('Regulation not found');
    }

    res.json(regulation);
  }

  private async createRegulation(req: Request, res: Response): Promise<void> {
    const { seasonId, sections } = req.body;

    const regulation = await this.regulationService.createWithSections(
      { seasonId },
      sections
    );

    res.status(201).json(regulation);
  }

  private async updateRegulation(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { sections, ...regulationData } = req.body;

    if (!id) {
      throw new BadRequestException('Regulation ID is required');
    }

    const regulation = await this.regulationService.updateWithSections(
      id,
      regulationData,
      sections
    );

    if (!regulation) {
      throw new NotFoundException('Regulation not found');
    }

    res.json(regulation);
  }

  private async publishRegulation(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id) {
      throw new BadRequestException('Regulation ID is required');
    }

    const regulation = await this.regulationService.publish(id);

    if (!regulation) {
      throw new NotFoundException('Regulation not found');
    }

    res.json(regulation);
  }

  private async reorderSections(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { sections } = req.body;

    if (!id) {
      throw new BadRequestException('Regulation ID is required');
    }

    const success = await this.regulationService.reorderSections(id, sections);

    if (!success) {
      throw new NotFoundException('Regulation not found');
    }

    res.json({ success: true, message: 'Sections reordered successfully' });
  }

  private async deleteRegulation(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id) {
      throw new BadRequestException('Regulation ID is required');
    }

    const success = await this.regulationService.delete(id);

    if (!success) {
      throw new NotFoundException('Regulation not found');
    }

    res.status(204).send();
  }
} 