import { Repository } from 'typeorm';

import { Category } from '../models/category.entity';
import { BaseRepositoryImpl } from './base.repository.impl';

export interface CategoryWithRegistrationCount extends Category {
  registrationCount: number;
}

export class CategoryRepository extends BaseRepositoryImpl<Category> {
  constructor(repository: Repository<Category>) {
    super(repository);
  }

  async findByName(name: string): Promise<Category[]> {
    return this.repository.find({ where: { name } });
  }

  async findByNameAndSeason(
    name: string,
    seasonId: string
  ): Promise<Category | null> {
    return this.repository.findOne({ where: { name, seasonId } });
  }

  async findByBallast(ballast: number): Promise<Category[]> {
    return this.repository.find({ where: { ballast } });
  }

  async findBySeasonId(seasonId: string): Promise<Category[]> {
    return this.repository.find({ where: { seasonId } });
  }

  async findBySeasonIdWithRegistrationCount(
    seasonId: string
  ): Promise<CategoryWithRegistrationCount[]> {
    return this.repository
      .createQueryBuilder('category')
      .leftJoin(
        'SeasonRegistrationCategories',
        'src',
        'src.categoryId = category.id'
      )
      .leftJoin('SeasonRegistrations', 'sr', 'sr.id = src.registrationId')
      .addSelect('COUNT(DISTINCT CASE WHEN sr.inscriptionType = :inscriptionType THEN sr.id END)', 'registrationCount')
      .where('category.seasonId = :seasonId', { seasonId })
      .setParameter('inscriptionType', 'por_temporada')
      .groupBy('category.id')
      .getRawAndEntities()
      .then(result => {
        return result.entities.map((category, index) => ({
          ...category,
          registrationCount:
            parseInt(result.raw[index].registrationCount, 10) || 0,
        }));
      });
  }

  async findByIdsWithRegistrationCount(
    categoryIds: string[]
  ): Promise<CategoryWithRegistrationCount[]> {
    if (categoryIds.length === 0) return [];

    return this.repository
      .createQueryBuilder('category')
      .leftJoin(
        'SeasonRegistrationCategories',
        'src',
        'src.categoryId = category.id'
      )
      .leftJoin('SeasonRegistrations', 'sr', 'sr.id = src.registrationId')
      .addSelect('COUNT(DISTINCT CASE WHEN sr.inscriptionType = :inscriptionType THEN sr.id END)', 'registrationCount')
      .where('category.id IN (:...categoryIds)', { categoryIds })
      .setParameter('inscriptionType', 'por_temporada')
      .groupBy('category.id')
      .getRawAndEntities()
      .then(result => {
        return result.entities.map((category, index) => ({
          ...category,
          registrationCount:
            parseInt(result.raw[index].registrationCount, 10) || 0,
        }));
      });
  }
}
