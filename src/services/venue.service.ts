import { DeepPartial } from 'typeorm';
import { BaseService } from './base.service';
import { Venue } from '../models/venue.entity';
import { VenueRepository } from '../repositories/venue.repository';

export class VenueService extends BaseService<Venue> {
  constructor(private venueRepository: VenueRepository) {
    super(venueRepository);
  }

  async findAll(): Promise<Venue[]> {
    return super.findAll();
  }

  async findById(id: string): Promise<Venue | null> {
    return super.findById(id);
  }

  async create(venueData: DeepPartial<Venue>): Promise<Venue> {
    return super.create(venueData);
  }

  async update(id: string, venueData: DeepPartial<Venue>): Promise<Venue | null> {
    return super.update(id, venueData);
  }

  async delete(id: string): Promise<boolean> {
    return super.delete(id);
  }
}