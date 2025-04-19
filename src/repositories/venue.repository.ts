import { Repository } from 'typeorm';
import { Venue } from '../models/venue.entity';
import { BaseRepositoryImpl } from './base.repository.impl';

export class VenueRepository extends BaseRepositoryImpl<Venue> {
  constructor(repository: Repository<Venue>) {
    super(repository);
  }
}