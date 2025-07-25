import { Repository } from 'typeorm';

import { Season } from '../models/season.entity';
import { BaseRepositoryImpl } from './base.repository.impl';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class SeasonRepository extends BaseRepositoryImpl<Season> {
  constructor(repository: Repository<Season>) {
    super(repository);
  }

  async findByChampionshipId(
    championshipId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResult<Season>> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.repository.findAndCount({
      where: { championshipId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findAllPaginated(
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResult<Season>> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.repository.findAndCount({
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findBySlug(slug: string): Promise<Season | null> {
    return this.repository.findOneBy({ slug });
  }
}
