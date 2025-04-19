import { DeepPartial } from 'typeorm';
import { BaseService } from './base.service';
import { Season } from '../models/season.entity';
import { SeasonRepository } from '../repositories/season.repository';

export class SeasonService extends BaseService<Season> {
  constructor(private seasonRepository: SeasonRepository) {
    super(seasonRepository);
  }

  async findAll(): Promise<Season[]> {
    return super.findAll();
  }

  async findById(id: string): Promise<Season | null> {
    return super.findById(id);
  }

  async create(seasonData: DeepPartial<Season>): Promise<Season> {
    return super.create(seasonData);
  }

  async update(id: string, seasonData: DeepPartial<Season>): Promise<Season | null> {
    return super.update(id, seasonData);
  }

  async delete(id: string): Promise<boolean> {
    return super.delete(id);
  }
}