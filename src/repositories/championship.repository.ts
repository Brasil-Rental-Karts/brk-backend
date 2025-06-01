import { Repository } from 'typeorm';
import { BaseRepositoryImpl } from './base.repository.impl';
import { Championship } from '../models/championship.entity';

export class ChampionshipRepository extends BaseRepositoryImpl<Championship> {
  constructor(repository: Repository<Championship>) {
    super(repository);
  }
} 