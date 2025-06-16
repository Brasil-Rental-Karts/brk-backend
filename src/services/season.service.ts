import { Season } from '../models/season.entity';
import { SeasonRepository, PaginatedResult } from '../repositories/season.repository';
import { BaseService } from './base.service';
import { RedisService } from './redis.service';

export interface SeasonCacheData {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  championshipId: string;
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
    
    // O cache será atualizado via database events, não aqui
    
    return season;
  }

  async update(id: string, seasonData: Partial<Season>): Promise<Season | null> {
    const season = await super.update(id, seasonData);
    
    // O cache será atualizado via database events, não aqui
    
    return season;
  }

  async delete(id: string): Promise<boolean> {
    const result = await super.delete(id);
    
    // O cache será atualizado via database events, não aqui
    
    return result;
  }

  async findById(id: string): Promise<Season | null> {
    // Apenas busca no banco, sem interferir no cache
    const season = await super.findById(id);
    return season;
  }

  async findAll(): Promise<Season[]> {
    // Apenas busca no banco, sem interferir no cache
    const seasons = await super.findAll();
    return seasons;
  }

  async findByChampionshipId(championshipId: string, page: number = 1, limit: number = 10): Promise<PaginatedResult<Season>> {
    // Apenas busca no banco, sem interferir no cache
    return await this.seasonRepository.findByChampionshipId(championshipId, page, limit);
  }

  async findAllPaginated(page: number = 1, limit: number = 10): Promise<PaginatedResult<Season>> {
    // Apenas busca no banco, sem interferir no cache
    return await this.seasonRepository.findAllPaginated(page, limit);
  }

  // Métodos para buscar dados do cache Redis (para API cache)
  async getSeasonBasicInfo(id: string): Promise<SeasonCacheData | null> {
    const cachedData = await this.getCachedSeasonData(id);
    return cachedData;
  }

  // Buscar todas as temporadas de um campeonato no cache (alta performance)
  async getChampionshipSeasonsBasicInfo(championshipId: string): Promise<SeasonCacheData[]> {
    try {
      // Busca a lista de IDs das seasons do campeonato
      const seasonIds = await this.redisService.getChampionshipSeasonIds(championshipId);
      
      if (!seasonIds || seasonIds.length === 0) {
        return [];
      }

      // Busca os dados de todas as seasons em paralelo
      const seasonsPromises = seasonIds.map(id => this.getCachedSeasonData(id));
      const seasons = await Promise.all(seasonsPromises);
      
      // Filtra apenas as seasons que foram encontradas no cache
      return seasons.filter(season => season !== null) as SeasonCacheData[];
    } catch (error) {
      console.error('Error getting championship seasons from cache:', error);
      return [];
    }
  }

  // Buscar múltiplas temporadas por IDs (alta performance)
  async getMultipleSeasonsBasicInfo(ids: string[]): Promise<SeasonCacheData[]> {
    const results: SeasonCacheData[] = [];

    // Busca apenas no cache, sem fallback para banco
    const cachePromises = ids.map(async (id) => {
      const cached = await this.getCachedSeasonData(id);
      if (cached) {
        results.push(cached);
      }
    });

    await Promise.all(cachePromises);
    return results;
  }

  // Métodos privados para cache (usados apenas pelos database events)
  private async getCachedSeasonData(id: string): Promise<SeasonCacheData | null> {
    try {
      const key = `season:${id}`;
      return await this.redisService.getData(key);
    } catch (error) {
      console.error('Error getting cached season data:', error);
      return null;
    }
  }
} 