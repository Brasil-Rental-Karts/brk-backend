import { Repository } from 'typeorm';
import { BaseRepositoryImpl } from './base.repository.impl';
import { Category } from '../models/category.entity';

export class CategoryRepository extends BaseRepositoryImpl<Category> {
  constructor(repository: Repository<Category>) {
    super(repository);
  }

  async findByName(name: string): Promise<Category[]> {
    return this.repository.find({ where: { name } });
  }

  async findByNameAndSeason(name: string, seasonId: string): Promise<Category | null> {
    return this.repository.findOne({ where: { name, seasonId } });
  }

  async findByBallast(ballast: number): Promise<Category[]> {
    return this.repository.find({ where: { ballast } });
  }

  async findBySeasonId(seasonId: string): Promise<Category[]> {
    return this.repository.find({ where: { seasonId } });
  }
} 