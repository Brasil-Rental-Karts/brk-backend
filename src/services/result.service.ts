import { DeepPartial } from 'typeorm';
import { BaseService } from './base.service';
import { Result } from '../models/result.entity';
import { ResultRepository } from '../repositories/result.repository';

export class ResultService extends BaseService<Result> {
  constructor(private resultRepository: ResultRepository) {
    super(resultRepository);
  }

  async findAll(): Promise<Result[]> {
    return super.findAll();
  }

  async findById(id: string): Promise<Result | null> {
    return super.findById(id);
  }

  async create(resultData: DeepPartial<Result>): Promise<Result> {
    return super.create(resultData);
  }

  async update(id: string, resultData: DeepPartial<Result>): Promise<Result | null> {
    return super.update(id, resultData);
  }

  async delete(id: string): Promise<boolean> {
    return super.delete(id);
  }
}