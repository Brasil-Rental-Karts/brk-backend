import { BaseService } from './base.service';
import { Category } from '../models/category.entity';
import { CategoryRepository } from '../repositories/category.repository';
import { validateBatteriesConfig } from '../types/category.types';
import { RedisService } from './redis.service';
import { SeasonService } from './season.service';

export interface CategoryCacheData {
  id: string;
  name: string;
  ballast: number;
  maxPilots: number;
  minimumAge: number;
  seasonId: string;
}

export class CategoryService extends BaseService<Category> {
  private redisService: RedisService;

  constructor(
    private categoryRepository: CategoryRepository,
    private seasonService?: SeasonService,
    private stageService?: any
  ) {
    super(categoryRepository);
    this.redisService = RedisService.getInstance();
  }

  async create(categoryData: Partial<Category>): Promise<Category> {
    const category = await super.create(categoryData);
    
    // O cache será atualizado via database events, não aqui
    
    return category;
  }

  async update(id: string, categoryData: Partial<Category>): Promise<Category | null> {
    const category = await super.update(id, categoryData);
    
    // O cache será atualizado via database events, não aqui
    
    return category;
  }

  async delete(id: string): Promise<boolean> {
    const result = await super.delete(id);
    
    // O cache será atualizado via database events, não aqui
    
    return result;
  }

  async findByName(name: string): Promise<Category[]> {
    return this.categoryRepository.findByName(name);
  }

  async findByNameAndSeason(name: string, seasonIdOrSlug: string): Promise<Category | null> {
    // Try to resolve season by slug or ID if season service is available
    if (this.seasonService) {
      try {
        const season = await this.seasonService.findBySlugOrId(seasonIdOrSlug);
        if (season) {
          return this.categoryRepository.findByNameAndSeason(name, season.id);
        }
      } catch (error) {
        console.error('Error resolving season by slug/ID:', error);
      }
    }
    
    // Fallback to direct ID lookup
    return this.categoryRepository.findByNameAndSeason(name, seasonIdOrSlug);
  }

  async findByBallast(ballast: number): Promise<Category[]> {
    const numericBallast = typeof ballast === 'string' ? parseInt(ballast, 10) : ballast;
    if (isNaN(numericBallast)) {
      return []; // ou lançar um erro, dependendo da lógica de negócio
    }
    return this.categoryRepository.findByBallast(numericBallast);
  }

  async findBySeasonId(seasonIdOrSlug: string): Promise<Category[]> {
    // Try to resolve season by slug or ID if season service is available
    if (this.seasonService) {
      try {
        const season = await this.seasonService.findBySlugOrId(seasonIdOrSlug);
        if (season) {
          return this.categoryRepository.findBySeasonId(season.id);
        }
      } catch (error) {
        console.error('Error resolving season by slug/ID:', error);
      }
    }
    
    // Fallback to direct ID lookup
    return this.categoryRepository.findBySeasonId(seasonIdOrSlug);
  }

  async findByStageId(stageId: string): Promise<Category[]> {
    // First, get the stage to find its categoryIds
    if (!this.stageService) {
      throw new Error('Stage service not available');
    }
    
    const stage = await this.stageService.findById(stageId);
    
    if (!stage || !stage.categoryIds || stage.categoryIds.length === 0) {
      return [];
    }

    // Get all categories that are in the stage's categoryIds
    const categories = await this.categoryRepository.findByIds(stage.categoryIds);
    return categories;
  }

  // Métodos para buscar dados do cache Redis (para API cache)
  async getCategoryBasicInfo(id: string): Promise<CategoryCacheData | null> {
    const cachedData = await this.getCachedCategoryData(id);
    return cachedData;
  }

  // Buscar todas as categorias de uma temporada no cache (alta performance)
  async getSeasonCategoriesBasicInfo(seasonId: string): Promise<CategoryCacheData[]> {
    try {
      // Busca a lista de IDs das categorias da temporada
      const categoryIds = await this.redisService.getSeasonCategoryIds(seasonId);
      
      if (!categoryIds || categoryIds.length === 0) {
        return [];
      }

      // Busca os dados de todas as categorias em paralelo
      const categoriesPromises = categoryIds.map(id => this.getCachedCategoryData(id));
      const categories = await Promise.all(categoriesPromises);
      
      // Filtra apenas as categorias que foram encontradas no cache
      return categories.filter(category => category !== null) as CategoryCacheData[];
    } catch (error) {
      console.error('Error getting season categories from cache:', error);
      return [];
    }
  }

  // Buscar múltiplas categorias por IDs (alta performance)
  async getMultipleCategoriesBasicInfo(ids: string[]): Promise<CategoryCacheData[]> {
    try {
      // Usa o novo método otimizado com Redis pipeline
      return await this.redisService.getMultipleCategoriesBasicInfo(ids);
    } catch (error) {
      console.error('Error getting multiple categories from cache:', error);
      return [];
    }
  }

  /**
   * Verifica se um usuário está inscrito em uma categoria usando cache
   */
  async isUserRegisteredInCategory(categoryId: string, userId: string): Promise<boolean> {
    try {
      // Primeiro tenta buscar do cache
      const isInCache = await this.redisService.isUserInCategory(categoryId, userId);
      
      if (isInCache) {
        return true;
      }

      // Se não está no cache, busca do banco de dados
      // Esta é uma implementação simplificada - em produção você pode querer
      // implementar uma query mais eficiente
      return false;
    } catch (error) {
      console.error('Error checking if user is registered in category:', error);
      return false;
    }
  }

  /**
   * Obtém todos os usuários inscritos em uma categoria usando cache
   */
  async getCategoryPilots(categoryId: string): Promise<string[]> {
    try {
      // Primeiro tenta buscar do cache
      const cachedPilots = await this.redisService.getCachedCategoryPilots(categoryId);
      
      if (cachedPilots.length > 0) {
        return cachedPilots;
      }

      // Se não há cache, retorna array vazio
      // O cache deve ser populado pelo AdminStatsService
      return [];
    } catch (error) {
      console.error('Error getting category pilots:', error);
      return [];
    }
  }

  // Métodos privados para cache (usados apenas pelos database events)
  private async getCachedCategoryData(id: string): Promise<CategoryCacheData | null> {
    try {
      const key = `category:${id}`;
      return await this.redisService.getData(key);
    } catch (error) {
      console.error('Error getting cached category data:', error);
      return null;
    }
  }

  async validateCategoryData(data: any, isUpdate: boolean = false): Promise<string[]> {
    const errors: string[] = [];

    if (!isUpdate || data.name !== undefined) {
      if (!data.name || typeof data.name !== 'string') {
        errors.push('Nome da categoria é obrigatório e deve ser uma string');
      } else if (data.name.length > 75) {
        errors.push('Nome da categoria deve ter no máximo 75 caracteres');
      }
    }

    if (!isUpdate || data.ballast !== undefined) {
      if (typeof data.ballast !== 'number' || data.ballast < 0 || data.ballast > 999) {
        errors.push('Lastro deve ser um número entre 0 e 999');
      }
    }

    if (!isUpdate || data.maxPilots !== undefined) {
      if (!Number.isInteger(data.maxPilots) || data.maxPilots < 0 || data.maxPilots > 999) {
        errors.push('Máximo de pilotos deve ser um número inteiro entre 0 e 999');
      }
    }

    if (!isUpdate || data.batteriesConfig !== undefined) {
      if (!Array.isArray(data.batteriesConfig)) {
        errors.push('Configuração de baterias deve ser um array');
      } else {
        const batteryErrors = validateBatteriesConfig(data.batteriesConfig);
        errors.push(...batteryErrors);
      }
    }

    if (!isUpdate || data.minimumAge !== undefined) {
      if (!Number.isInteger(data.minimumAge) || data.minimumAge < 0 || data.minimumAge > 999) {
        errors.push('Idade mínima deve ser um número inteiro entre 0 e 999');
      }
    }

    if (!isUpdate || data.seasonId !== undefined) {
      if (!data.seasonId || typeof data.seasonId !== 'string') {
        errors.push('ID da temporada é obrigatório e deve ser uma string');
      }
    }

    // Validações para descarte
    if (data.allowDiscarding !== undefined && data.allowDiscarding) {
      if (!data.discardingType || (data.discardingType !== 'bateria' && data.discardingType !== 'etapa')) {
        errors.push('Tipo de descarte deve ser "bateria" ou "etapa"');
      }
      
      if (data.discardingQuantity === undefined || data.discardingQuantity < 1) {
        errors.push('Quantidade de descarte deve ser maior que 0');
      }
    }

    return errors;
  }
} 