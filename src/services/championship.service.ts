import { DeepPartial } from 'typeorm';
import { BaseService } from './base.service';
import { Championship } from '../models/championship.entity';
import { ChampionshipRepository } from '../repositories/championship.repository';

export class ChampionshipService extends BaseService<Championship> {
  constructor(private championshipRepository: ChampionshipRepository) {
    super(championshipRepository);
  }

  async findByClubId(clubId: string): Promise<Championship[]> {
    return this.championshipRepository.findByClubId(clubId);
  }

  async findAll(): Promise<Championship[]> {
    return super.findAll();
  }

  async findById(id: string): Promise<Championship | null> {
    return super.findById(id);
  }

  async create(championshipData: DeepPartial<Championship>): Promise<Championship> {
    return super.create(championshipData);
  }

  async update(id: string, championshipData: DeepPartial<Championship>): Promise<Championship | null> {
    return super.update(id, championshipData);
  }

  async delete(id: string): Promise<boolean> {
    return super.delete(id);
  }
} 