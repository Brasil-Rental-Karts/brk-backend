import { Repository } from 'typeorm';
import { Season } from '../models/season.entity';
import { BaseRepositoryImpl } from './base.repository.impl';

export class SeasonRepository extends BaseRepositoryImpl<Season> {
  constructor(repository: Repository<Season>) {
    super(repository);
  }
}