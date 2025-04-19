import { DeepPartial } from 'typeorm';
import { BaseService } from './base.service';
import { Fleet } from '../models/fleet.entity';
import { FleetRepository } from '../repositories/fleet.repository';

export class FleetService extends BaseService<Fleet> {
  constructor(private fleetRepository: FleetRepository) {
    super(fleetRepository);
  }

  async findAll(): Promise<Fleet[]> {
    return super.findAll();
  }

  async findById(id: string): Promise<Fleet | null> {
    return super.findById(id);
  }

  async create(fleetData: DeepPartial<Fleet>): Promise<Fleet> {
    return super.create(fleetData);
  }

  async update(id: string, fleetData: DeepPartial<Fleet>): Promise<Fleet | null> {
    return super.update(id, fleetData);
  }

  async delete(id: string): Promise<boolean> {
    return super.delete(id);
  }
}