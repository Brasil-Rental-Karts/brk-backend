import { BaseService } from './base.service';
import { Category } from '../models/category.entity';
import { CategoryRepository, CategoryWithRegistrationCount } from '../repositories/category.repository';
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
  registrationCount?: number;
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

  async findBySeasonIdWithRegistrationCount(seasonIdOrSlug: string): Promise<CategoryWithRegistrationCount[]> {
    // Try to resolve season by slug or ID if season service is available
    if (this.seasonService) {
      try {
        const season = await this.seasonService.findBySlugOrId(seasonIdOrSlug);
        if (season) {
          return this.categoryRepository.findBySeasonIdWithRegistrationCount(season.id);
        }
      } catch (error) {
        console.error('Error resolving season by slug/ID:', error);
      }
    }
    
    // Fallback to direct ID lookup
    return this.categoryRepository.findBySeasonIdWithRegistrationCount(seasonIdOrSlug);
  }

  async findByIdsWithRegistrationCount(categoryIds: string[]): Promise<CategoryWithRegistrationCount[]> {
    return this.categoryRepository.findByIdsWithRegistrationCount(categoryIds);
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

  async findByStageIdWithRegistrationCount(stageId: string): Promise<CategoryWithRegistrationCount[]> {
    // First, get the stage to find its categoryIds
    if (!this.stageService) {
      throw new Error('Stage service not available');
    }
    
    const stage = await this.stageService.findById(stageId);
    
    if (!stage || !stage.categoryIds || stage.categoryIds.length === 0) {
      return [];
    }

    // Get all categories that are in the stage's categoryIds with registration count
    const categories = await this.categoryRepository.findByIdsWithRegistrationCount(stage.categoryIds);
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

    // Validações básicas
    if (!data.name || data.name.trim().length === 0) {
      errors.push('Nome da categoria é obrigatório');
    } else if (data.name.length > 75) {
      errors.push('Nome da categoria deve ter no máximo 75 caracteres');
    }

    if (!data.ballast || isNaN(data.ballast) || data.ballast < 0) {
      errors.push('Lastro deve ser um número positivo');
    }

    if (!data.maxPilots || isNaN(data.maxPilots) || data.maxPilots <= 0) {
      errors.push('Máximo de pilotos deve ser um número positivo');
    }

    if (!data.minimumAge || isNaN(data.minimumAge) || data.minimumAge < 0) {
      errors.push('Idade mínima deve ser um número positivo');
    }

    if (!data.seasonId) {
      errors.push('Temporada é obrigatória');
    }

    // Validação da configuração de baterias
    if (data.batteriesConfig) {
      const batteryErrors = validateBatteriesConfig(data.batteriesConfig);
      errors.push(...batteryErrors);
    }

    return errors;
  }
} 