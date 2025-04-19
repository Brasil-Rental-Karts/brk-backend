import { Request, Response } from 'express';
import { BaseCrudController } from './base.crud.controller';
import { Championship } from '../models/championship.entity';
import { ChampionshipService } from '../services/championship.service';
import { CreateChampionshipDto, UpdateChampionshipDto } from '../dtos/championship.dto';
import { UserRole } from '../models/user.entity';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';

export class ChampionshipController extends BaseCrudController<Championship, CreateChampionshipDto, UpdateChampionshipDto> {
  protected service: ChampionshipService;
  protected createDtoClass = CreateChampionshipDto;
  protected updateDtoClass = UpdateChampionshipDto;
  protected allowedRoles = {
    create: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    read: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER, UserRole.PILOT, UserRole.MEMBER],
    update: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER],
    delete: [UserRole.ADMINISTRATOR, UserRole.ORGANIZER]
  };

  constructor(championshipService: ChampionshipService) {
    super('/championships');
    this.service = championshipService;
    this.initializeRoutes();
  }

  initializeRoutes(): void {
    this.initializeCrudRoutes();
    
    // Custom route to get championships by club
    this.router.get(
      '/club/:clubId',
      authMiddleware,
      roleMiddleware(this.allowedRoles.read),
      this.getByClubId.bind(this)
    );
  }

  protected async create(req: Request, res: Response): Promise<void> {
    try {
      // Transform DTO data to entity format
      const championshipData = {
        ...req.body,
        club: { id: req.body.clubId }
      };
      
      // Remove the clubId as it's now in the club object
      delete championshipData.clubId;
      
      const result = await this.service.create(championshipData);
      res.status(201).json(result);
    } catch (error) {
      console.error(`Error creating championship: ${error}`);
      res.status(500).json({ message: 'Failed to create championship' });
    }
  }

  protected async update(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      
      // Transform DTO data to entity format
      const championshipData = { ...req.body };
      
      // If clubId is provided, transform it to the expected format
      if (championshipData.clubId) {
        championshipData.club = { id: championshipData.clubId };
        delete championshipData.clubId;
      }
      
      const updatedItem = await this.service.update(id, championshipData);
      
      if (!updatedItem) {
        res.status(404).json({ message: 'Championship not found' });
        return;
      }
      
      res.status(200).json(updatedItem);
    } catch (error) {
      console.error(`Error updating championship: ${error}`);
      res.status(500).json({ message: 'Failed to update championship' });
    }
  }

  private async getByClubId(req: Request, res: Response): Promise<void> {
    try {
      const clubId = req.params.clubId;
      const championships = await this.service.findByClubId(clubId);
      
      res.status(200).json(championships);
    } catch (error) {
      console.error(`Error retrieving championships by club: ${error}`);
      res.status(500).json({ message: 'Failed to retrieve championships by club' });
    }
  }
} 