import { Season } from '../models/season.entity';
import { SeasonRepository, PaginatedResult } from '../repositories/season.repository';
import { BaseService } from './base.service';
import { RedisService } from './redis.service';

export interface SeasonCacheData {
  id: string;
  name: string;
  description: string;
  status: string;
  startDate: Date;
  endDate: Date;
}

export class SeasonService extends BaseService<Season> {
  private redisService: RedisService;
  private seasonRepository: SeasonRepository;

  constructor(seasonRepository: SeasonRepository) {
    super(seasonRepository);
    this.seasonRepository = seasonRepository;
    this.redisService = RedisService.getInstance();
  }

  async create(seasonData: Partial<Season>): Promise<Season> {
    const season = await super.create(seasonData);
    
    // Cache no Redis os dados básicos da temporada
    await this.cacheSeasonData(season);
    
    return season;
  }

  async update(id: string, seasonData: Partial<Season>): Promise<Season | null> {
    const season = await super.update(id, seasonData);
    
    if (season) {
      // Atualiza o cache no Redis
      await this.cacheSeasonData(season);
    }
    
    return season;
  }

  async delete(id: string): Promise<boolean> {
    const result = await super.delete(id);
    
    if (result) {
      // Remove do cache Redis
      await this.invalidateSeasonCache(id);
    }
    
    return result;
  }

  async findById(id: string): Promise<Season | null> {
    // Primeiro tenta buscar no cache Redis
    const cachedData = await this.getCachedSeasonData(id);
    
    if (cachedData) {
      console.log(`Season ${id} found in cache`);
    }
    
    // Busca no banco de dados
    const season = await super.findById(id);
    
    if (season && !cachedData) {
      // Se não estava no cache, adiciona
      await this.cacheSeasonData(season);
    }
    
    return season;
  }

  async findByChampionshipId(
    championshipId: string, 
    page: number = 1, 
    limit: number = 10
  ): Promise<PaginatedResult<Season>> {
    const result = await this.seasonRepository.findByChampionshipId(championshipId, page, limit);
    
    // Cache todas as temporadas encontradas
    for (const season of result.data) {
      await this.cacheSeasonData(season);
    }
    
    return result;
  }

  async findAllPaginated(
    page: number = 1, 
    limit: number = 10
  ): Promise<PaginatedResult<Season>> {
    const result = await this.seasonRepository.findAllPaginated(page, limit);
    
    // Cache todas as temporadas encontradas
    for (const season of result.data) {
      await this.cacheSeasonData(season);
    }
    
    return result;
  }

  // Métodos específicos para Redis Cache
  private async cacheSeasonData(season: Season): Promise<void> {
    try {
      const cacheData: SeasonCacheData = {
        id: season.id,
        name: season.name,
        description: season.description,
        status: season.status,
        startDate: season.startDate,
        endDate: season.endDate
      };

      const key = `season:${season.id}`;
      await this.redisService.setData(key, cacheData, 3600); // Cache por 1 hora
      
      console.log(`Season ${season.id} cached successfully`);
    } catch (error) {
      console.error('Error caching season data:', error);
    }
  }

  private async getCachedSeasonData(id: string): Promise<SeasonCacheData | null> {
    try {
      const key = `season:${id}`;
      return await this.redisService.getData(key);
    } catch (error) {
      console.error('Error getting cached season data:', error);
      return null;
    }
  }

  private async invalidateSeasonCache(id: string): Promise<void> {
    try {
      const key = `season:${id}`;
      await this.redisService.deleteData(key);
      
      console.log(`Season ${id} cache invalidated`);
    } catch (error) {
      console.error('Error invalidating season cache:', error);
    }
  }

  // Método para buscar apenas dados em cache (performance otimizada)
  async getSeasonBasicInfo(id: string): Promise<SeasonCacheData | null> {
    const cachedData = await this.getCachedSeasonData(id);
    
    if (cachedData) {
      return cachedData;
    }
    
    // Se não está em cache, busca no banco e cacheia
    const season = await this.findById(id);
    return season ? {
      id: season.id,
      name: season.name,
      description: season.description,
      status: season.status,
      startDate: season.startDate,
      endDate: season.endDate
    } : null;
  }
} 