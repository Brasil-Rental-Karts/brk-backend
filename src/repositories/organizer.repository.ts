import { Repository } from 'typeorm';
import { Organizer } from '../models/organizer.entity';
import { BaseRepositoryImpl } from './base.repository.impl';

export class OrganizerRepository extends BaseRepositoryImpl<Organizer> {
  constructor(repository: Repository<Organizer>) {
    super(repository);
  }
}