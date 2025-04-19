import { Repository } from 'typeorm';
import { Penalty } from '../models/penalty.entity';
import { BaseRepositoryImpl } from './base.repository.impl';

export class PenaltyRepository extends BaseRepositoryImpl<Penalty> {
  constructor(repository: Repository<Penalty>) {
    super(repository);
  }
}