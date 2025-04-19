import { DeepPartial } from 'typeorm';
import { BaseService } from './base.service';
import { Organizer } from '../models/organizer.entity';
import { OrganizerRepository } from '../repositories/organizer.repository';

export class OrganizerService extends BaseService<Organizer> {
  constructor(private organizerRepository: OrganizerRepository) {
    super(organizerRepository);
  }

  async findAll(): Promise<Organizer[]> {
    return super.findAll();
  }

  async findById(id: string): Promise<Organizer | null> {
    return super.findById(id);
  }

  async create(organizerData: DeepPartial<Organizer>): Promise<Organizer> {
    return super.create(organizerData);
  }

  async update(id: string, organizerData: DeepPartial<Organizer>): Promise<Organizer | null> {
    return super.update(id, organizerData);
  }

  async delete(id: string): Promise<boolean> {
    return super.delete(id);
  }
}