import { DeepPartial } from 'typeorm';
import { BaseService } from './base.service';
import { Heat } from '../models/heat.entity';
import { HeatRepository } from '../repositories/heat.repository';

export class HeatService extends BaseService<Heat> {
  constructor(private heatRepository: HeatRepository) {
    super(heatRepository);
  }

  async findAll(): Promise<Heat[]> {
    return super.findAll();
  }

  async findById(id: string): Promise<Heat | null> {
    return super.findById(id);
  }

  async create(heatData: DeepPartial<Heat>): Promise<Heat> {
    return super.create(heatData);
  }

  async update(id: string, heatData: DeepPartial<Heat>): Promise<Heat | null> {
    return super.update(id, heatData);
  }

  async delete(id: string): Promise<boolean> {
    return super.delete(id);
  }
}