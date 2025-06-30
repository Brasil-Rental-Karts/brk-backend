import { Router, Request, Response } from 'express';
import { BaseController } from './base.controller';
import { RegulationService } from '../services/regulation.service';
import { ChampionshipStaffService } from '../services/championship-staff.service';
import { SeasonService } from '../services/season.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { seasonAccessMiddleware } from '../middleware/championship-access.middleware';
import { CreateRegulationDto, UpdateRegulationDto, ReorderRegulationsDto } from '../dtos/regulation.dto';
import { NotFoundException } from '../exceptions/not-found.exception';

export class RegulationController extends BaseController {
  constructor(
    private regulationService: RegulationService,
    private championshipStaffService: ChampionshipStaffService,
    private seasonService: SeasonService
  ) {
    super('/regulations');
    this.initializeRoutes();
  }

  public initializeRoutes(): void {
    // Get regulations by season ID
    this.router.get('/season/:seasonId', 
      authMiddleware, 
      seasonAccessMiddleware(this.championshipStaffService, this.seasonService),
      this.findBySeasonId.bind(this)
    );

    // Get regulations by season ID (ordered)
    this.router.get('/season/:seasonId/ordered', 
      authMiddleware, 
      seasonAccessMiddleware(this.championshipStaffService, this.seasonService),
      this.findBySeasonIdOrdered.bind(this)
    );

    // Get regulation by ID
    this.router.get('/:id', authMiddleware, this.findById.bind(this));

    // Create regulation
    this.router.post('/', 
      authMiddleware, 
      seasonAccessMiddleware(this.championshipStaffService, this.seasonService, 'seasonId'),
      this.create.bind(this)
    );

    // Update regulation
    this.router.put('/:id', authMiddleware, this.update.bind(this));

    // Delete regulation
    this.router.delete('/:id', authMiddleware, this.delete.bind(this));

    // Reorder regulations
    this.router.post('/reorder', 
      authMiddleware, 
      seasonAccessMiddleware(this.championshipStaffService, this.seasonService, 'seasonId'),
      this.reorder.bind(this)
    );
  }

  private async create(req: Request, res: Response): Promise<void> {
    try {
      const dto: CreateRegulationDto = req.body;
      const regulation = await this.regulationService.createRegulation(dto);
      res.status(201).json({
        success: true,
        data: regulation,
        message: 'Regulation created successfully'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdateRegulationDto = req.body;
      
      const regulation = await this.regulationService.updateRegulation(id, dto);
      res.status(200).json({
        success: true,
        data: regulation,
        message: 'Regulation updated successfully'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.regulationService.deleteRegulation(id);
      res.status(200).json({
        success: true,
        message: 'Regulation deleted successfully'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async findById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const regulation = await this.regulationService.findById(id);
      if (!regulation) {
        throw new NotFoundException('Regulation not found');
      }
      res.status(200).json({
        success: true,
        data: regulation
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async findBySeasonId(req: Request, res: Response): Promise<void> {
    try {
      const { seasonId } = req.params;
      const regulations = await this.regulationService.findBySeasonId(seasonId);
      res.status(200).json({
        success: true,
        data: regulations
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async findBySeasonIdOrdered(req: Request, res: Response): Promise<void> {
    try {
      const { seasonId } = req.params;
      const regulations = await this.regulationService.findBySeasonIdOrdered(seasonId);
      res.status(200).json({
        success: true,
        data: regulations
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private async reorder(req: Request, res: Response): Promise<void> {
    try {
      const dto: ReorderRegulationsDto = req.body;
      await this.regulationService.reorderRegulations(dto);
      res.status(200).json({
        success: true,
        message: 'Regulations reordered successfully'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private handleError(res: Response, error: any): void {
    console.error('Regulation controller error:', error);
    
    if (error instanceof NotFoundException) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
} 