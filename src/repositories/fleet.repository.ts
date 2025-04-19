import { Repository } from 'typeorm';
import { Fleet } from '../models/fleet.entity';
import { BaseRepositoryImpl } from './base.repository.impl';

export class FleetRepository extends BaseRepositoryImpl<Fleet> {
  constructor(repository: Repository<Fleet>) {
    super(repository);
  }
}