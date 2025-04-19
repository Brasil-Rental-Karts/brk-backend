import { DeepPartial } from 'typeorm';
import { BaseService } from './base.service';
import { Stage } from '../models/stage.entity';
import { StageRepository } from '../repositories/stage.repository';

export class StageService extends BaseService<Stage> {
  constructor(private stageRepository: StageRepository) {
    super(stageRepository);
  }

  async findAll(): Promise<Stage[]> {
    return super.findAll();
  }

  async findById(id: string): Promise<Stage | null> {
    return super.findById(id);
  }

  async create(stageData: DeepPartial<Stage>): Promise<Stage> {
    return super.create(stageData);
  }

  async update(id: string, stageData: DeepPartial<Stage>): Promise<Stage | null> {
    return super.update(id, stageData);
  }

  async delete(id: string): Promise<boolean> {
    return super.delete(id);
  }
}