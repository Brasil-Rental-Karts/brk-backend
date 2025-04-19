import { DeepPartial } from 'typeorm';
import { BaseService } from './base.service';
import { Administrator } from '../models/administrator.entity';
import { AdministratorRepository } from '../repositories/administrator.repository';

export class AdministratorService extends BaseService<Administrator> {
  constructor(private administratorRepository: AdministratorRepository) {
    super(administratorRepository);
  }

  async findAll(): Promise<Administrator[]> {
    return super.findAll();
  }

  async findById(id: string): Promise<Administrator | null> {
    return super.findById(id);
  }

  async create(administratorData: DeepPartial<Administrator>): Promise<Administrator> {
    return super.create(administratorData);
  }

  async update(id: string, administratorData: DeepPartial<Administrator>): Promise<Administrator | null> {
    return super.update(id, administratorData);
  }

  async delete(id: string): Promise<boolean> {
    return super.delete(id);
  }
}