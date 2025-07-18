import { Request, Response } from 'express';
import { PenaltyService } from '../services/penalty.service';
import { PenaltyRepositoryImpl } from '../repositories/penalty.repository.impl';
import { CreatePenaltyDto, UpdatePenaltyDto, AppealPenaltyDto } from '../dtos/penalty.dto';
import { PenaltyType, PenaltyStatus } from '../models/penalty.entity';
import { BaseController } from './base.controller';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';
import { validationMiddleware } from '../middleware/validator.middleware';
import { UserRole } from '../models/user.entity';

export class PenaltyController extends BaseController {
  private penaltyService: PenaltyService;

  constructor(penaltyService: PenaltyService) {
    super('/penalties');
    this.penaltyService = penaltyService;
    this.initializeRoutes();
  }

  initializeRoutes(): void {
    // CREATE
    this.router.post(
      '/',
      authMiddleware,
      roleMiddleware([UserRole.ADMINISTRATOR, UserRole.MANAGER]),
      validationMiddleware(CreatePenaltyDto),
      this.createPenalty.bind(this)
    );

    // UPDATE
    this.router.put(
      '/:id',
      authMiddleware,
      roleMiddleware([UserRole.ADMINISTRATOR, UserRole.MANAGER]),
      validationMiddleware(UpdatePenaltyDto),
      this.updatePenalty.bind(this)
    );

    // APPLY PENALTY
    this.router.post(
      '/:id/apply',
      authMiddleware,
      roleMiddleware([UserRole.ADMINISTRATOR, UserRole.MANAGER]),
      this.applyPenalty.bind(this)
    );

    // CANCEL PENALTY
    this.router.post(
      '/:id/cancel',
      authMiddleware,
      roleMiddleware([UserRole.ADMINISTRATOR, UserRole.MANAGER]),
      this.cancelPenalty.bind(this)
    );

    // APPEAL PENALTY
    this.router.post(
      '/:id/appeal',
      authMiddleware,
      roleMiddleware([UserRole.MEMBER, UserRole.ADMINISTRATOR, UserRole.MANAGER]),
      validationMiddleware(AppealPenaltyDto),
      this.appealPenalty.bind(this)
    );

    // GET BY ID
    this.router.get(
      '/:id',
      authMiddleware,
      roleMiddleware([UserRole.ADMINISTRATOR, UserRole.MANAGER]),
      this.getPenaltyById.bind(this)
    );

    // GET BY USER ID
    this.router.get(
      '/user/:userId',
      authMiddleware,
      roleMiddleware([UserRole.ADMINISTRATOR, UserRole.MANAGER]),
      this.getPenaltiesByUserId.bind(this)
    );

    // GET BY CHAMPIONSHIP ID
    this.router.get(
      '/championship/:championshipId',
      authMiddleware,
      roleMiddleware([UserRole.ADMINISTRATOR, UserRole.MANAGER]),
      this.getPenaltiesByChampionshipId.bind(this)
    );

    // GET BY SEASON ID
    this.router.get(
      '/season/:seasonId',
      authMiddleware,
      roleMiddleware([UserRole.ADMINISTRATOR, UserRole.MANAGER]),
      this.getPenaltiesBySeasonId.bind(this)
    );

    // GET BY STAGE ID
    this.router.get(
      '/stage/:stageId',
      authMiddleware,
      roleMiddleware([UserRole.ADMINISTRATOR, UserRole.MANAGER]),
      this.getPenaltiesByStageId.bind(this)
    );

    // GET BY CATEGORY ID
    this.router.get(
      '/category/:categoryId',
      authMiddleware,
      roleMiddleware([UserRole.ADMINISTRATOR, UserRole.MANAGER]),
      this.getPenaltiesByCategoryId.bind(this)
    );

    // GET ACTIVE PENALTIES
    this.router.get(
      '/active/:userId/:championshipId',
      authMiddleware,
      roleMiddleware([UserRole.ADMINISTRATOR, UserRole.MANAGER]),
      this.getActivePenalties.bind(this)
    );

    // GET PENDING PENALTIES
    this.router.get(
      '/pending',
      authMiddleware,
      roleMiddleware([UserRole.ADMINISTRATOR, UserRole.MANAGER]),
      this.getPendingPenalties.bind(this)
    );

    // GET BY TYPE
    this.router.get(
      '/type/:type',
      authMiddleware,
      roleMiddleware([UserRole.ADMINISTRATOR, UserRole.MANAGER]),
      this.getPenaltiesByType.bind(this)
    );

    // GET BY STATUS
    this.router.get(
      '/status/:status',
      authMiddleware,
      roleMiddleware([UserRole.ADMINISTRATOR, UserRole.MANAGER]),
      this.getPenaltiesByStatus.bind(this)
    );

    // DELETE
    this.router.delete(
      '/:id',
      authMiddleware,
      roleMiddleware([UserRole.ADMINISTRATOR]),
      this.deletePenalty.bind(this)
    );
  }

  async createPenalty(req: Request, res: Response): Promise<void> {
    try {
      const data: CreatePenaltyDto = req.body;
      const appliedByUserId = req.user?.id;

      if (!appliedByUserId) {
        throw new BadRequestException('User not authenticated');
      }

      const penalty = await this.penaltyService.createPenalty(data, appliedByUserId);
      res.status(201).json(penalty);
    } catch (error) {
      console.error('Error creating penalty:', error);
      if (error instanceof BadRequestException) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Failed to create penalty' });
      }
    }
  }

  async updatePenalty(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdatePenaltyDto = req.body;

      const penalty = await this.penaltyService.updatePenalty(id, data);
      res.status(200).json(penalty);
    } catch (error) {
      console.error('Error updating penalty:', error);
      res.status(500).json({ message: 'Failed to update penalty' });
    }
  }

  async applyPenalty(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const penalty = await this.penaltyService.applyPenalty(id);
      res.status(200).json(penalty);
    } catch (error) {
      console.error('Error applying penalty:', error);
      res.status(500).json({ message: 'Failed to apply penalty' });
    }
  }

  async cancelPenalty(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const penalty = await this.penaltyService.cancelPenalty(id);
      res.status(200).json(penalty);
    } catch (error) {
      console.error('Error cancelling penalty:', error);
      res.status(500).json({ message: 'Failed to cancel penalty' });
    }
  }

  async appealPenalty(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data: AppealPenaltyDto = req.body;
      const appealedByUserId = req.user?.id;

      if (!appealedByUserId) {
        throw new BadRequestException('User not authenticated');
      }

      const penalty = await this.penaltyService.appealPenalty(id, data, appealedByUserId);
      res.status(200).json(penalty);
    } catch (error) {
      console.error('Error appealing penalty:', error);
      res.status(500).json({ message: 'Failed to appeal penalty' });
    }
  }

  async getPenaltyById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const penalty = await this.penaltyService.getPenaltyById(id);
      res.status(200).json(penalty);
    } catch (error) {
      console.error('Error getting penalty:', error);
      res.status(500).json({ message: 'Failed to get penalty' });
    }
  }

  async getPenaltiesByUserId(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const penalties = await this.penaltyService.getPenaltiesByUserId(userId);
      res.status(200).json(penalties);
    } catch (error) {
      console.error('Error getting penalties by user:', error);
      res.status(500).json({ message: 'Failed to get penalties by user' });
    }
  }

  async getPenaltiesByChampionshipId(req: Request, res: Response): Promise<void> {
    try {
      const { championshipId } = req.params;

      const penalties = await this.penaltyService.getPenaltiesByChampionshipId(championshipId);
      res.status(200).json(penalties);
    } catch (error) {
      console.error('Error getting penalties by championship:', error);
      res.status(500).json({ message: 'Failed to get penalties by championship' });
    }
  }

  async getPenaltiesBySeasonId(req: Request, res: Response): Promise<void> {
    try {
      const { seasonId } = req.params;

      const penalties = await this.penaltyService.getPenaltiesBySeasonId(seasonId);
      res.status(200).json(penalties);
    } catch (error) {
      console.error('Error getting penalties by season:', error);
      res.status(500).json({ message: 'Failed to get penalties by season' });
    }
  }

  async getPenaltiesByStageId(req: Request, res: Response): Promise<void> {
    try {
      const { stageId } = req.params;

      const penalties = await this.penaltyService.getPenaltiesByStageId(stageId);
      res.status(200).json(penalties);
    } catch (error) {
      console.error('Error getting penalties by stage:', error);
      res.status(500).json({ message: 'Failed to get penalties by stage' });
    }
  }

  async getPenaltiesByCategoryId(req: Request, res: Response): Promise<void> {
    try {
      const { categoryId } = req.params;

      const penalties = await this.penaltyService.getPenaltiesByCategoryId(categoryId);
      res.status(200).json(penalties);
    } catch (error) {
      console.error('Error getting penalties by category:', error);
      res.status(500).json({ message: 'Failed to get penalties by category' });
    }
  }

  async getActivePenalties(req: Request, res: Response): Promise<void> {
    try {
      const { userId, championshipId } = req.params;

      const penalties = await this.penaltyService.getActivePenalties(userId, championshipId);
      res.status(200).json(penalties);
    } catch (error) {
      console.error('Error getting active penalties:', error);
      res.status(500).json({ message: 'Failed to get active penalties' });
    }
  }

  async getPendingPenalties(req: Request, res: Response): Promise<void> {
    try {
      const penalties = await this.penaltyService.getPendingPenalties();
      res.status(200).json(penalties);
    } catch (error) {
      console.error('Error getting pending penalties:', error);
      res.status(500).json({ message: 'Failed to get pending penalties' });
    }
  }

  async getPenaltiesByType(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;

      if (!Object.values(PenaltyType).includes(type as PenaltyType)) {
        throw new BadRequestException('Invalid penalty type');
      }

      const penalties = await this.penaltyService.getPenaltiesByType(type as PenaltyType);
      res.status(200).json(penalties);
    } catch (error) {
      console.error('Error getting penalties by type:', error);
      res.status(500).json({ message: 'Failed to get penalties by type' });
    }
  }

  async getPenaltiesByStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.params;

      if (!Object.values(PenaltyStatus).includes(status as PenaltyStatus)) {
        throw new BadRequestException('Invalid penalty status');
      }

      const penalties = await this.penaltyService.getPenaltiesByStatus(status as PenaltyStatus);
      res.status(200).json(penalties);
    } catch (error) {
      console.error('Error getting penalties by status:', error);
      res.status(500).json({ message: 'Failed to get penalties by status' });
    }
  }

  async deletePenalty(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const deleted = await this.penaltyService.deletePenalty(id);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: 'Failed to delete penalty' });
      }
    } catch (error) {
      console.error('Error deleting penalty:', error);
      res.status(500).json({ message: 'Failed to delete penalty' });
    }
  }
} 