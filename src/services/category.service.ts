import { BaseService } from './base.service';
import { Category } from '../models/category.entity';
import { CategoryRepository } from '../repositories/category.repository';
import { validateBatteriesConfig } from '../types/category.types';
import { DatabaseChangeEventsService } from './database-change-events.service';

export interface CategoryCacheData {
  id: string;
  name: string;
  ballast: number;
  maxPilots: number;
  minimumAge: number;
  seasonId: string;
}

export class CategoryService extends BaseService<Category> {
  private databaseEventsService: DatabaseChangeEventsService;
  private categoryRepository: CategoryRepository;

  constructor(categoryRepository: CategoryRepository) {
    super(categoryRepository);
    this.databaseEventsService = DatabaseChangeEventsService.getInstance();
    this.categoryRepository = categoryRepository;
  }

  async create(categoryData: Partial<Category>): Promise<Category> {
    const category = await super.create(categoryData);
    
    // Publish database change event
    await this.databaseEventsService.onEntityChange('INSERT', 'Category', {
      id: category.id,
      name: category.name,
      ballast: category.ballast,
      maxPilots: category.maxPilots,
      minimumAge: category.minimumAge,
      seasonId: category.seasonId
    });
    
    return category;
  }

  async update(id: string, categoryData: Partial<Category>): Promise<Category | null> {
    const category = await super.update(id, categoryData);
    
    if (category) {
      // Publish database change event
      await this.databaseEventsService.onEntityChange('UPDATE', 'Category', {
        id: category.id,
        name: category.name,
        ballast: category.ballast,
        maxPilots: category.maxPilots,
        minimumAge: category.minimumAge,
        seasonId: category.seasonId
      });
    }
    
    return category;
  }

  async delete(id: string): Promise<boolean> {
    const category = await this.findById(id);
    const result = await super.delete(id);
    
    if (result && category) {
      // Publish database change event
      await this.databaseEventsService.onEntityChange('DELETE', 'Category', {
        id: category.id,
        name: category.name,
        seasonId: category.seasonId
      });
    }
    
    return result;
  }

  async findById(id: string): Promise<Category | null> {
    return super.findById(id);
  }

  async findAll(): Promise<Category[]> {
    return super.findAll();
  }

  async findByName(name: string): Promise<Category[]> {
    return this.categoryRepository.findByName(name);
  }

  async findByNameAndSeason(name: string, seasonId: string): Promise<Category | null> {
    // Direct ID lookup - query the repository directly
    return this.categoryRepository['repository'].findOne({
      where: { name, seasonId }
    });
  }

  async findByBallast(ballast: number): Promise<Category[]> {
    const numericBallast = typeof ballast === 'string' ? parseInt(ballast, 10) : ballast;
    if (isNaN(numericBallast)) {
      return []; // ou lançar um erro, dependendo da lógica de negócio
    }
    return this.categoryRepository.findByBallast(numericBallast);
  }

  async findBySeasonId(seasonId: string): Promise<Category[]> {
    return this.categoryRepository['repository'].find({
      where: { seasonId }
    });
  }

  // Métodos que anteriormente usavam cache agora consultam diretamente o banco
  async getCategoryBasicInfo(id: string): Promise<CategoryCacheData | null> {
    try {
      const category = await this.findById(id);
      
      if (!category) {
        return null;
      }
      
      return {
        id: category.id,
        name: category.name,
        ballast: category.ballast,
        maxPilots: category.maxPilots,
        minimumAge: category.minimumAge,
        seasonId: category.seasonId
      };
    } catch (error) {
      console.error('Error getting category basic info:', error);
      return null;
    }
  }

  // Buscar categorias por IDs de temporada (substitui consulta de cache)
  async getSeasonCategoriesBasicInfo(seasonId: string): Promise<CategoryCacheData[]> {
    try {
      const categories = await this.findBySeasonId(seasonId);
      
      return categories.map(category => ({
        id: category.id,
        name: category.name,
        ballast: category.ballast,
        maxPilots: category.maxPilots,
        minimumAge: category.minimumAge,
        seasonId: category.seasonId
      }));
    } catch (error) {
      console.error('Error getting season categories:', error);
      return [];
    }
  }

  // Buscar múltiplas categorias por IDs
  async getMultipleCategoriesBasicInfo(ids: string[]): Promise<CategoryCacheData[]> {
    try {
      const categories = await this.categoryRepository['repository'].findByIds(ids);
      
      return categories.map(category => ({
        id: category.id,
        name: category.name,
        ballast: category.ballast,
        maxPilots: category.maxPilots,
        minimumAge: category.minimumAge,
        seasonId: category.seasonId
      }));
    } catch (error) {
      console.error('Error getting multiple categories:', error);
      return [];
    }
  }

  // Método legado para compatibilidade - agora consulta o banco diretamente
  async getCachedCategoryData(id: string): Promise<CategoryCacheData | null> {
    return this.getCategoryBasicInfo(id);
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

    return errors;
  }
} 