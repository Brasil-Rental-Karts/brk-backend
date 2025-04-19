import { Repository } from 'typeorm';
import { Heat } from '../models/heat.entity';
import { BaseRepositoryImpl } from './base.repository.impl';

export class HeatRepository extends BaseRepositoryImpl<Heat> {
  constructor(repository: Repository<Heat>) {
    super(repository);
  }
}