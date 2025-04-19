import { DeepPartial } from 'typeorm';
import { BaseService } from './base.service';
import { Club } from '../models/club.entity';
import { ClubRepository } from '../repositories/club.repository';

export class ClubService extends BaseService<Club> {
  constructor(private clubRepository: ClubRepository) {
    super(clubRepository);
  }

  async findAll(): Promise<Club[]> {
    return super.findAll();
  }

  async findById(id: string): Promise<Club | null> {
    return super.findById(id);
  }

  async create(clubData: DeepPartial<Club>): Promise<Club> {
    return super.create(clubData);
  }

  async update(id: string, clubData: DeepPartial<Club>): Promise<Club | null> {
    return super.update(id, clubData);
  }

  async delete(id: string): Promise<boolean> {
    return super.delete(id);
  }
}