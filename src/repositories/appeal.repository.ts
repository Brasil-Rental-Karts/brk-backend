import { Repository } from 'typeorm';
import { Appeal } from '../models/appeal.entity';
import { BaseRepositoryImpl } from './base.repository.impl';

export class AppealRepository extends BaseRepositoryImpl<Appeal> {
  constructor(repository: Repository<Appeal>) {
    super(repository);
  }
}