import { DeepPartial } from 'typeorm';
import { BaseService } from './base.service';
import { Season } from '../models/season.entity';
import { SeasonRepository } from '../repositories/season.repository';
import { HttpException } from '../middleware/error.middleware';
import { ChampionshipService } from './championship.service';
import { CategoryService } from './category.service';
import { Category } from '../models/category.entity';

export enum SeasonStatus {
  PLANNED = 'Planned',
  ACTIVE = 'Active',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled'
}

export class SeasonService extends BaseService<Season> {
  constructor(
    private seasonRepository: SeasonRepository,
    private championshipService: ChampionshipService,
    private categoryService: CategoryService
  ) {
    super(seasonRepository);
  }

  async findByChampionshipId(championshipId: string): Promise<Season[]> {
    const seasons = await this.findAll();
    return seasons.filter(season => season.championship && season.championship.id === championshipId);
  }

  async findCurrentSeasons(): Promise<Season[]> {
    const seasons = await this.findAll();
    const currentDate = new Date();
    
    return seasons.filter(season => {
      // Check if season is marked as active
      if (season.status === SeasonStatus.ACTIVE) {
        return true;
      }
      
      // Otherwise check dates
      const startDate = season.startDate ? new Date(season.startDate) : null;
      const endDate = season.endDate ? new Date(season.endDate) : null;
      
      if (!startDate || !endDate) {
        return false;
      }
      
      return startDate <= currentDate && endDate >= currentDate;
    });
  }

  async findAll(): Promise<Season[]> {
    return super.findAll();
  }

  async findById(id: string): Promise<Season | null> {
    return super.findById(id);
  }

  async create(seasonData: DeepPartial<Season>): Promise<Season> {
    // Validate championship exists if provided
    if (seasonData.championship && seasonData.championship.id) {
      const championshipId = seasonData.championship.id;
      const championship = await this.championshipService.findById(championshipId);
      
      if (!championship) {
        throw new HttpException(404, 'Championship not found');
      }
    }
    
    // Validate dates if provided
    if (seasonData.startDate && seasonData.endDate) {
      const startDateValue = seasonData.startDate as any;
      const endDateValue = seasonData.endDate as any;
      
      const startDate = new Date(startDateValue);
      const endDate = new Date(endDateValue);
      
      if (endDate < startDate) {
        throw new HttpException(400, 'End date cannot be before start date');
      }
    }
    
    // Set default status if not provided
    if (!seasonData.status) {
      seasonData.status = SeasonStatus.PLANNED;
    }
    
    return super.create(seasonData);
  }

  async update(id: string, seasonData: DeepPartial<Season>): Promise<Season | null> {
    // Check season exists
    const season = await this.findById(id);
    if (!season) {
      throw new HttpException(404, 'Season not found');
    }
    
    // Validate championship exists if being updated
    if (seasonData.championship && seasonData.championship.id) {
      const championshipId = seasonData.championship.id;
      const championship = await this.championshipService.findById(championshipId);
      
      if (!championship) {
        throw new HttpException(404, 'Championship not found');
      }
    }
    
    // Validate dates if being updated
    if (seasonData.startDate || seasonData.endDate) {
      const startDateValue = seasonData.startDate ? seasonData.startDate as any : season.startDate;
      const endDateValue = seasonData.endDate ? seasonData.endDate as any : season.endDate;
      
      if (startDateValue && endDateValue) {
        const startDate = new Date(startDateValue);
        const endDate = new Date(endDateValue);
        
        if (endDate < startDate) {
          throw new HttpException(400, 'End date cannot be before start date');
        }
      }
    }
    
    return super.update(id, seasonData);
  }

  async delete(id: string): Promise<boolean> {
    // Check season exists
    const season = await this.findById(id);
    if (!season) {
      throw new HttpException(404, 'Season not found');
    }
    
    // Business rule: Don't allow deletion of active seasons
    if (season.status === SeasonStatus.ACTIVE) {
      throw new HttpException(400, 'Cannot delete an active season');
    }
    
    return super.delete(id);
  }
  
  async addCategory(seasonId: string, categoryId: string): Promise<Season | null> {
    // Check season exists
    const season = await this.findById(seasonId);
    if (!season) {
      throw new HttpException(404, 'Season not found');
    }
    
    // Check category exists
    const category = await this.categoryService.findById(categoryId);
    if (!category) {
      throw new HttpException(404, 'Category not found');
    }
    
    // Initialize categories array if not exists
    if (!season.categories) {
      season.categories = [];
    }
    
    // Check if category is already assigned
    const categoryExists = season.categories.some(cat => cat.id === categoryId);
    if (categoryExists) {
      return season; // Category already assigned
    }
    
    // Create category reference
    const categoryToAdd = new Category();
    categoryToAdd.id = categoryId;
    
    // Add category to season
    season.categories.push(categoryToAdd);
    
    // Update the season
    return this.update(seasonId, { categories: season.categories });
  }
  
  async removeCategory(seasonId: string, categoryId: string): Promise<Season | null> {
    // Check season exists
    const season = await this.findById(seasonId);
    if (!season) {
      throw new HttpException(404, 'Season not found');
    }
    
    // Check if categories exist
    if (!season.categories || season.categories.length === 0) {
      return season; // No categories to remove
    }
    
    // Filter out the category
    season.categories = season.categories.filter(cat => cat.id !== categoryId);
    
    // Update the season
    return this.update(seasonId, { categories: season.categories });
  }
  
  async activateSeason(id: string): Promise<Season | null> {
    return this.update(id, { status: SeasonStatus.ACTIVE });
  }
  
  async completeSeason(id: string): Promise<Season | null> {
    return this.update(id, { status: SeasonStatus.COMPLETED });
  }
  
  async cancelSeason(id: string): Promise<Season | null> {
    return this.update(id, { status: SeasonStatus.CANCELLED });
  }
}