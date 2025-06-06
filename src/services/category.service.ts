import { BaseService } from './base.service';
import { Category } from '../models/category.entity';
import { CategoryRepository } from '../repositories/category.repository';

export class CategoryService extends BaseService<Category> {
  constructor(private categoryRepository: CategoryRepository) {
    super(categoryRepository);
  }

  async findByName(name: string): Promise<Category | null> {
    return this.categoryRepository.findByName(name);
  }

  async findByBallast(ballast: string): Promise<Category[]> {
    return this.categoryRepository.findByBallast(ballast);
  }

  async findBySeasonId(seasonId: string): Promise<Category[]> {
    return this.categoryRepository.findBySeasonId(seasonId);
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

    if (!isUpdate || data.batteryQuantity !== undefined) {
      if (!Number.isInteger(data.batteryQuantity) || data.batteryQuantity < 1) {
        errors.push('Quantidade de baterias deve ser um número inteiro maior que 0');
      }
    }

    if (!isUpdate || data.startingGridFormat !== undefined) {
      if (!data.startingGridFormat || typeof data.startingGridFormat !== 'string') {
        errors.push('Formato de grid de largada é obrigatório e deve ser uma string');
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