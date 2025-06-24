import { Season } from '../models/season.entity';
import { SeasonRepository, PaginatedResult } from '../repositories/season.repository';
import { BaseService } from './base.service';
import { DatabaseChangeEventsService } from './database-change-events.service';

export interface SeasonCacheData {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  championshipId: string;
  registrationOpen: boolean;
}

export class SeasonService extends BaseService<Season> {
  private databaseEventsService: DatabaseChangeEventsService;
  private seasonRepository: SeasonRepository;

  constructor(seasonRepository: SeasonRepository) {
    super(seasonRepository);
    this.databaseEventsService = DatabaseChangeEventsService.getInstance();
    this.seasonRepository = seasonRepository;
  }

  async create(seasonData: Partial<Season>): Promise<Season> {
    const season = await super.create(seasonData);
    
    // Publish database change event
    await this.databaseEventsService.onEntityChange('INSERT', 'Season', {
      id: season.id,
      name: season.name,
      slug: season.slug,
      startDate: season.startDate?.toISOString(),
      endDate: season.endDate?.toISOString(),
      championshipId: season.championshipId,
      registrationOpen: season.registrationOpen
    });
    
    return season;
  }

  async update(id: string, seasonData: Partial<Season>): Promise<Season | null> {
    const season = await super.update(id, seasonData);
    
    if (season) {
      // Publish database change event
      await this.databaseEventsService.onEntityChange('UPDATE', 'Season', {
        id: season.id,
        name: season.name,
        slug: season.slug,
        startDate: season.startDate?.toISOString(),
        endDate: season.endDate?.toISOString(),
        championshipId: season.championshipId,
        registrationOpen: season.registrationOpen
      });
    }
    
    return season;
  }

  async delete(id: string): Promise<boolean> {
    const season = await this.findById(id);
    const result = await super.delete(id);
    
    if (result && season) {
      // Publish database change event
      await this.databaseEventsService.onEntityChange('DELETE', 'Season', {
        id: season.id,
        name: season.name,
        championshipId: season.championshipId
      });
    }
    
    return result;
  }

  async findById(id: string): Promise<Season | null> {
    return super.findById(id);
  }

  async findBySlugOrId(slugOrId: string): Promise<Season | null> {
    // Check if it's a UUID (ID) first
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (uuidRegex.test(slugOrId)) {
      // It's an ID
      return this.findById(slugOrId);
    } else {
      // It's a slug - query the repository directly
      return this.seasonRepository['repository'].findOne({
        where: { slug: slugOrId }
      });
    }
  }

  async findAll(): Promise<Season[]> {
    return super.findAll();
  }

  async findByChampionshipId(championshipId: string, page?: number, limit?: number): Promise<Season[] | PaginatedResult<Season>> {
    if (page && limit) {
      // Busca paginada
      return await this.seasonRepository.findByChampionshipId(championshipId, page, limit);
    } else {
      // Busca todas as temporadas
      return this.seasonRepository['repository'].find({
        where: { championshipId }
      });
    }
  }

  async findAllPaginated(page: number = 1, limit: number = 10): Promise<PaginatedResult<Season>> {
    // Apenas busca no banco, sem interferir no cache
    return await this.seasonRepository.findAllPaginated(page, limit);
  }

  // Métodos que anteriormente usavam cache agora consultam diretamente o banco
  async getSeasonBasicInfo(id: string): Promise<any | null> {
    const season = await this.findById(id);
    
    if (!season) {
      return null;
    }
    
    return {
      id: season.id,
      name: season.name,
      slug: season.slug,
      startDate: season.startDate,
      endDate: season.endDate,
      championshipId: season.championshipId,
      registrationOpen: season.registrationOpen
    };
  }

  // Buscar múltiplas temporadas por IDs
  async getMultipleSeasonsBasicInfo(ids: string[]): Promise<any[]> {
    try {
      const seasons = await this.seasonRepository['repository'].findByIds(ids);
      
      return seasons.map(season => ({
        id: season.id,
        name: season.name,
        slug: season.slug,
        startDate: season.startDate,
        endDate: season.endDate,
        championshipId: season.championshipId,
        registrationOpen: season.registrationOpen
      }));
    } catch (error) {
      console.error('Error getting multiple seasons:', error);
      return [];
    }
  }

  // Buscar temporadas por campeonato (substitui consulta de cache)
  async getChampionshipSeasons(championshipId: string): Promise<any[]> {
    try {
      const seasons = await this.seasonRepository['repository'].find({
        where: { championshipId }
      });
      
      return seasons.map(season => ({
        id: season.id,
        name: season.name,
        slug: season.slug,
        startDate: season.startDate,
        endDate: season.endDate,
        championshipId: season.championshipId,
        registrationOpen: season.registrationOpen
      }));
    } catch (error) {
      console.error('Error getting championship seasons:', error);
      return [];
    }
  }
} 