import { Championship } from '../models/championship.entity';
import { ChampionshipRepository } from '../repositories/championship.repository';
import { BaseService } from './base.service';
import { RedisService } from './redis.service';

export interface ChampionshipCacheData {
  id: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
}

export class ChampionshipService extends BaseService<Championship> {
  private redisService: RedisService;
  private championshipRepository: ChampionshipRepository;

  constructor(championshipRepository: ChampionshipRepository) {
    super(championshipRepository);
    this.championshipRepository = championshipRepository;
    this.redisService = RedisService.getInstance();
  }

  async create(championshipData: Partial<Championship>): Promise<Championship> {
    const championship = await super.create(championshipData);
    
    // Cache no Redis apenas os campos da seção "Sobre o Campeonato"
    await this.cacheChampionshipData(championship);
    
    return championship;
  }

  async update(id: string, championshipData: Partial<Championship>): Promise<Championship | null> {
    const championship = await super.update(id, championshipData);
    
    if (championship) {
      // Atualiza o cache no Redis
      await this.cacheChampionshipData(championship);
    }
    
    return championship;
  }

  async delete(id: string): Promise<boolean> {
    const result = await super.delete(id);
    
    if (result) {
      // Remove do cache Redis
      await this.invalidateChampionshipCache(id);
    }
    
    return result;
  }

  async findById(id: string): Promise<Championship | null> {
    // Primeiro tenta buscar no cache Redis
    const cachedData = await this.getCachedChampionshipData(id);
    
    if (cachedData) {
      // Se encontrou no cache, busca os dados completos no banco
      // mas retorna rapidamente se só precisar dos dados básicos
      console.log(`Championship ${id} found in cache`);
    }
    
    // Busca no banco de dados
    const championship = await super.findById(id);
    
    if (championship && !cachedData) {
      // Se não estava no cache, adiciona
      await this.cacheChampionshipData(championship);
    }
    
    return championship;
  }

  async findAll(): Promise<Championship[]> {
    const championships = await super.findAll();
    
    // Cache todos os championships encontrados
    for (const championship of championships) {
      await this.cacheChampionshipData(championship);
    }
    
    return championships;
  }

  async findByOwnerId(ownerId: string): Promise<Championship[]> {
    // Usando o repositório TypeORM diretamente para consultas específicas
    const championships = await this.championshipRepository['repository'].find({
      where: { ownerId }
    });
    
    // Cache todos os championships encontrados
    for (const championship of championships) {
      await this.cacheChampionshipData(championship);
    }
    
    return championships;
  }

  // Métodos específicos para Redis Cache
  private async cacheChampionshipData(championship: Championship): Promise<void> {
    try {
      const cacheData: ChampionshipCacheData = {
        id: championship.id,
        name: championship.name,
        shortDescription: championship.shortDescription || '',
        fullDescription: championship.fullDescription || ''
      };

      const key = `championship:${championship.id}`;
      await this.redisService.setData(key, cacheData, 3600); // Cache por 1 hora
      
      console.log(`Championship ${championship.id} cached successfully`);
    } catch (error) {
      console.error('Error caching championship data:', error);
    }
  }

  private async getCachedChampionshipData(id: string): Promise<ChampionshipCacheData | null> {
    try {
      const key = `championship:${id}`;
      return await this.redisService.getData(key);
    } catch (error) {
      console.error('Error getting cached championship data:', error);
      return null;
    }
  }

  private async invalidateChampionshipCache(id: string): Promise<void> {
    try {
      const key = `championship:${id}`;
      await this.redisService.deleteData(key);
      
      console.log(`Championship ${id} cache invalidated`);
    } catch (error) {
      console.error('Error invalidating championship cache:', error);
    }
  }

  // Método para buscar apenas dados em cache (performance otimizada)
  async getChampionshipBasicInfo(id: string): Promise<ChampionshipCacheData | null> {
    const cachedData = await this.getCachedChampionshipData(id);
    
    if (cachedData) {
      return cachedData;
    }
    
    // Se não está em cache, busca no banco e cacheia
    const championship = await this.findById(id);
    return championship ? {
      id: championship.id,
      name: championship.name,
      shortDescription: championship.shortDescription || '',
      fullDescription: championship.fullDescription || ''
    } : null;
  }

  // Método para buscar múltiplos championships básicos do cache
  async getMultipleChampionshipsBasicInfo(ids: string[]): Promise<ChampionshipCacheData[]> {
    const results: ChampionshipCacheData[] = [];
    const missingIds: string[] = [];

    // Busca em paralelo no cache
    const cachePromises = ids.map(async (id) => {
      const cached = await this.getCachedChampionshipData(id);
      if (cached) {
        results.push(cached);
      } else {
        missingIds.push(id);
      }
    });

    await Promise.all(cachePromises);

    // Para os que não estão em cache, busca no banco usando consulta específica
    if (missingIds.length > 0) {
      const championships = await this.championshipRepository['repository'].findByIds(missingIds);
      
      for (const championship of championships) {
        const basicInfo: ChampionshipCacheData = {
          id: championship.id,
          name: championship.name,
          shortDescription: championship.shortDescription || '',
          fullDescription: championship.fullDescription || ''
        };
        
        results.push(basicInfo);
        // Cache para próximas consultas
        await this.cacheChampionshipData(championship);
      }
    }

    return results;
  }
} 