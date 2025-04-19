import { Repository } from 'typeorm';
import { Pilot } from '../models/pilot.entity';
import { BaseRepositoryImpl } from './base.repository.impl';

export class PilotRepository extends BaseRepositoryImpl<Pilot> {
  constructor(repository: Repository<Pilot>) {
    super(repository);
  }
}