import { Repository } from 'typeorm';

import { Championship } from '../models/championship.entity';
import { BaseRepositoryImpl } from './base.repository.impl';

export class ChampionshipRepository extends BaseRepositoryImpl<Championship> {
  constructor(repository: Repository<Championship>) {
    super(repository);
  }
}
