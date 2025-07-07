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
  registrationOpen: boolean;
  regulationsEnabled: boolean;
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
    
    // Adicionar nova temporada ao cache
    if (season) {
      await this.redisService.cacheSeasonBasicInfo(season.id, season);
    }
    
    return season;
  }

  async update(id: string, seasonData: Partial<Season>): Promise<Season | null> {
    const season = await super.update(id, seasonData);
    
    // Atualizar cache manualmente se a temporada foi encontrada e atualizada
    if (season) {
      await this.redisService.cacheSeasonBasicInfo(season.id, season);
    }
    
    return season;
  }

  async delete(id: string): Promise<boolean> {
    // Buscar informações da temporada antes de deletar para limpar o cache
    const season = await this.findById(id);
    const result = await super.delete(id);
    
    // Limpar cache se a temporada foi deletada com sucesso
    if (result && season) {
      await this.redisService.invalidateSeasonCache(id, season.championshipId);
      await this.redisService.invalidateSeasonIndexes(id);
    }
    
    return result;
  }

  async findById(id: string): Promise<Season | null> {
    // Apenas busca no banco, sem interferir no cache
    const season = await super.findById(id);
    return season;
  }

  async findBySlugOrId(slugOrId: string): Promise<Season | null> {
    try {
      // Verifica se é um UUID
      const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(slugOrId);
      
      console.log(`🔍 [BACKEND] Buscando temporada: ${slugOrId} (isUUID: ${isUUID})`);
      
      let season: Season | null = null;
      
      if (isUUID) {
        season = await this.findById(slugOrId);
      } else {
        season = await this.seasonRepository.findBySlug(slugOrId);
      }
      
      if (season) {
        console.log(`✅ [BACKEND] Temporada encontrada: ${season.name}`);
        // Garantir que paymentMethods nunca seja null ou vazio
        if (!season.paymentMethods || season.paymentMethods.length === 0) {
          console.warn(`⚠️ [BACKEND] Temporada ${season.id} sem métodos de pagamento válidos, usando PIX como padrão`);
          season.paymentMethods = ['pix' as any];
        }
      } else {
        console.log(`❌ [BACKEND] Temporada não encontrada: ${slugOrId}`);
      }
      
      return season;
    } catch (error) {
      console.error(`❌ [BACKEND] Erro ao buscar temporada ${slugOrId}:`, error);
      throw error;
    }
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
      return [];
    }
  }

  // Buscar múltiplas temporadas por IDs (alta performance)
  async getMultipleSeasonsBasicInfo(ids: string[]): Promise<SeasonCacheData[]> {
    try {
      // Usa o novo método otimizado com Redis pipeline
      return await this.redisService.getMultipleSeasonsBasicInfo(ids);
    } catch (error) {
      return [];
    }
  }

  // Método para forçar atualização do cache de uma temporada específica
  async refreshSeasonCache(id: string): Promise<boolean> {
    try {
      const season = await this.findById(id);
      if (!season) {
        return false;
      }

      await this.redisService.cacheSeasonBasicInfo(season.id, season);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Métodos privados para cache (usados apenas pelos database events)
  private async getCachedSeasonData(id: string): Promise<SeasonCacheData | null> {
    try {
      const key = `season:${id}`;
      return await this.redisService.getData(key);
    } catch (error) {
      return null;
    }
  }
} 