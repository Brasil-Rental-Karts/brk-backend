import { DeepPartial } from 'typeorm';
import { BaseService } from './base.service';
import { Penalty } from '../models/penalty.entity';
import { PenaltyRepository } from '../repositories/penalty.repository';

export class PenaltyService extends BaseService<Penalty> {
  constructor(private penaltyRepository: PenaltyRepository) {
    super(penaltyRepository);
  }

  async findAll(): Promise<Penalty[]> {
    return super.findAll();
  }

  async findById(id: string): Promise<Penalty | null> {
    return super.findById(id);
  }

  async create(penaltyData: DeepPartial<Penalty>): Promise<Penalty> {
    return super.create(penaltyData);
  }

  async update(id: string, penaltyData: DeepPartial<Penalty>): Promise<Penalty | null> {
    return super.update(id, penaltyData);
  }

  async delete(id: string): Promise<boolean> {
    return super.delete(id);
  }
}