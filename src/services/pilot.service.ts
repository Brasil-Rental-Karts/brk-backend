import { DeepPartial } from 'typeorm';
import { BaseService } from './base.service';
import { Pilot } from '../models/pilot.entity';
import { PilotRepository } from '../repositories/pilot.repository';

export class PilotService extends BaseService<Pilot> {
  constructor(private pilotRepository: PilotRepository) {
    super(pilotRepository);
  }

  async findAll(): Promise<Pilot[]> {
    return super.findAll();
  }

  async findById(id: string): Promise<Pilot | null> {
    return super.findById(id);
  }

  async create(pilotData: DeepPartial<Pilot>): Promise<Pilot> {
    return super.create(pilotData);
  }

  async update(id: string, pilotData: DeepPartial<Pilot>): Promise<Pilot | null> {
    return super.update(id, pilotData);
  }

  async delete(id: string): Promise<boolean> {
    return super.delete(id);
  }
}