import { Repository } from 'typeorm';
import { Result } from '../models/result.entity';
import { BaseRepositoryImpl } from './base.repository.impl';

export class ResultRepository extends BaseRepositoryImpl<Result> {
  constructor(repository: Repository<Result>) {
    super(repository);
  }
}