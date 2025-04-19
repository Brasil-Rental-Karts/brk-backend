import { Repository } from 'typeorm';
import { Stage } from '../models/stage.entity';
import { BaseRepositoryImpl } from './base.repository.impl';

export class StageRepository extends BaseRepositoryImpl<Stage> {
  constructor(repository: Repository<Stage>) {
    super(repository);
  }
}