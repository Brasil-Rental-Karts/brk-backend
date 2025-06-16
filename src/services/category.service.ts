import { BaseService } from './base.service';
import { Category } from '../models/category.entity';
import { CategoryRepository } from '../repositories/category.repository';
import { validateBatteriesConfig } from '../types/category.types';
import { RedisService } from './redis.service';

export interface CategoryCacheData {
  id: string;
  name: string;
  ballast: string;
  maxPilots: number;
  minimumAge: number;
  seasonId: string;
}

export class CategoryService extends BaseService<Category> {
  private redisService: RedisService;

  constructor(private categoryRepository: CategoryRepository) {
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

  async findByNameAndSeason(name: string, seasonId: string): Promise<Category | null> {
    return this.categoryRepository.findByNameAndSeason(name, seasonId);
  }

  async findByBallast(ballast: string): Promise<Category[]> {
    return this.categoryRepository.findByBallast(ballast);
  }

  async findBySeasonId(seasonId: string): Promise<Category[]> {
    return this.categoryRepository.findBySeasonId(seasonId);
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
      if (!data.ballast || typeof data.ballast !== 'string') {
        errors.push('Lastro é obrigatório e deve ser uma string');
      } else if (data.ballast.length > 10) {
        errors.push('Lastro deve ter no máximo 10 caracteres');
      }
    }

    if (!isUpdate || data.maxPilots !== undefined) {
      if (!Number.isInteger(data.maxPilots) || data.maxPilots < 1) {
        errors.push('Máximo de pilotos deve ser um número inteiro maior que 0');
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
      if (!Number.isInteger(data.minimumAge) || data.minimumAge < 1) {
        errors.push('Idade mínima deve ser um número inteiro maior que 0');
      }
    }

    if (!isUpdate || data.seasonId !== undefined) {
      if (!data.seasonId || typeof data.seasonId !== 'string') {
        errors.push('ID da temporada é obrigatório e deve ser uma string');
      }
    }

    return errors;
  }
} 