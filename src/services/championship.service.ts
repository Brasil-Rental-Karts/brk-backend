import { DeepPartial } from 'typeorm';
import { BaseService } from './base.service';
import { Championship } from '../models/championship.entity';
import { ChampionshipRepository } from '../repositories/championship.repository';
import { HttpException } from '../middleware/error.middleware';
import { ClubService } from './club.service';

export class ChampionshipService extends BaseService<Championship> {
  constructor(
    private championshipRepository: ChampionshipRepository,
    private clubService: ClubService
  ) {
    super(championshipRepository);
  }

  async findByClubId(clubId: string): Promise<Championship[]> {
    return this.championshipRepository.findByClubId(clubId);
  }

  async findActiveChampionships(): Promise<Championship[]> {
    const championships = await this.findAll();
    const currentDate = new Date();
    
    return championships.filter(championship => {
      const startDate = championship.startDate ? new Date(championship.startDate) : null;
      const endDate = championship.endDate ? new Date(championship.endDate) : null;
      
      // If championship has no end date or end date is in the future, consider it active
      if (!endDate) {
        return true;
      }
      
      return endDate >= currentDate;
    });
  }

  async findAll(): Promise<Championship[]> {
    return super.findAll();
  }

  async findById(id: string): Promise<Championship | null> {
    return super.findById(id);
  }

  async create(championshipData: DeepPartial<Championship>): Promise<Championship> {
    // Validate dates if provided
    if (championshipData.startDate && championshipData.endDate) {
      const startDateValue = championshipData.startDate as any;
      const endDateValue = championshipData.endDate as any;
      
      const startDate = new Date(startDateValue);
      const endDate = new Date(endDateValue);
      
      if (endDate < startDate) {
        throw new HttpException(400, 'End date cannot be before start date');
      }
    }
    
    // Verify club exists if provided
    if (championshipData.club && championshipData.club.id) {
      const clubId = championshipData.club.id;
      const club = await this.clubService.findById(clubId);
      
      if (!club) {
        throw new HttpException(404, 'Club not found');
      }
    }
    
    return super.create(championshipData);
  }

  async update(id: string, championshipData: DeepPartial<Championship>): Promise<Championship | null> {
    // Check championship exists
    const championship = await this.findById(id);
    if (!championship) {
      throw new HttpException(404, 'Championship not found');
    }
    
    // Validate dates if being updated
    if (championshipData.startDate || championshipData.endDate) {
      const startDateValue = championshipData.startDate ? championshipData.startDate as any : championship.startDate;
      const endDateValue = championshipData.endDate ? championshipData.endDate as any : championship.endDate;
      
      if (startDateValue && endDateValue) {
        const startDate = new Date(startDateValue);
        const endDate = new Date(endDateValue);
        
        if (endDate < startDate) {
          throw new HttpException(400, 'End date cannot be before start date');
        }
      }
    }
    
    // Verify club exists if being updated
    if (championshipData.club && championshipData.club.id) {
      const clubId = championshipData.club.id;
      const club = await this.clubService.findById(clubId);
      
      if (!club) {
        throw new HttpException(404, 'Club not found');
      }
    }
    
    return super.update(id, championshipData);
  }

  async delete(id: string): Promise<boolean> {
    // Check championship exists
    const championship = await this.findById(id);
    if (!championship) {
      throw new HttpException(404, 'Championship not found');
    }
    
    // Check if championship has any seasons before deletion
    if (championship.seasons && championship.seasons.length > 0) {
      throw new HttpException(400, 'Cannot delete championship with existing seasons. Remove all seasons first.');
    }
    
    return super.delete(id);
  }
  
  async getFullChampionshipDetails(id: string): Promise<Championship | null> {
    const championship = await this.findById(id);
    if (!championship) {
      throw new HttpException(404, 'Championship not found');
    }
    
    // The findById should load relationships if properly configured in the repository
    return championship;
  }
} 