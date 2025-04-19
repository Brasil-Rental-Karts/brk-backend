import { Repository } from 'typeorm';
import { Club } from '../models/club.entity';
import { BaseRepositoryImpl } from './base.repository.impl';

export class ClubRepository extends BaseRepositoryImpl<Club> {
  constructor(repository: Repository<Club>) {
    super(repository);
  }
}