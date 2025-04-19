import { DeepPartial } from 'typeorm';
import { BaseService } from './base.service';
import { Appeal } from '../models/appeal.entity';
import { AppealRepository } from '../repositories/appeal.repository';

export class AppealService extends BaseService<Appeal> {
  constructor(private appealRepository: AppealRepository) {
    super(appealRepository);
  }

  async findAll(): Promise<Appeal[]> {
    return super.findAll();
  }

  async findById(id: string): Promise<Appeal | null> {
    return super.findById(id);
  }

  async create(appealData: DeepPartial<Appeal>): Promise<Appeal> {
    return super.create(appealData);
  }

  async update(id: string, appealData: DeepPartial<Appeal>): Promise<Appeal | null> {
    return super.update(id, appealData);
  }

  async delete(id: string): Promise<boolean> {
    return super.delete(id);
  }
}