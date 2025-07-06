import { Repository } from 'typeorm';
import { BaseRepositoryImpl } from './base.repository.impl';
import { LapTimesRepository } from './lap-times.repository';
import { LapTimes, LapTime } from '../models/lap-times.entity';

export class LapTimesRepositoryImpl extends BaseRepositoryImpl<LapTimes> implements LapTimesRepository {
  constructor(repository: Repository<LapTimes>) {
    super(repository);
  }

  async findByStageId(stageId: string): Promise<LapTimes[]> {
    return this.repository.find({
      where: { stageId },
      relations: ['user', 'category'],
      order: { createdAt: 'ASC' }
    });
  }

  async findByStageAndCategory(stageId: string, categoryId: string): Promise<LapTimes[]> {
    return this.repository.find({
      where: { stageId, categoryId },
      relations: ['user'],
      order: { batteryIndex: 'ASC', createdAt: 'ASC' }
    });
  }

  async findByUserStageCategory(
    userId: string, 
    stageId: string, 
    categoryId: string, 
    batteryIndex?: number
  ): Promise<LapTimes | null> {
    const where: any = { userId, stageId, categoryId };
    
    if (batteryIndex !== undefined) {
      where.batteryIndex = batteryIndex;
    }

    return this.repository.findOne({
      where,
      relations: ['user', 'category']
    });
  }

  async saveLapTimes(
    userId: string, 
    stageId: string, 
    categoryId: string, 
    batteryIndex: number, 
    kartNumber: number, 
    lapTimes: LapTime[]
  ): Promise<LapTimes> {
    // Buscar registro existente
    let lapTimesEntity = await this.findByUserStageCategory(userId, stageId, categoryId, batteryIndex);
    
    if (lapTimesEntity) {
      // Atualizar registro existente
      lapTimesEntity.kartNumber = kartNumber;
      lapTimesEntity.lapTimes = lapTimes;
      lapTimesEntity.updatedAt = new Date();
    } else {
      // Criar novo registro
      lapTimesEntity = this.repository.create({
        userId,
        stageId,
        categoryId,
        batteryIndex,
        kartNumber,
        lapTimes
      });
    }

    return this.repository.save(lapTimesEntity);
  }

  async deleteLapTimes(userId: string, stageId: string, categoryId: string, batteryIndex?: number): Promise<void> {
    const where: any = { userId, stageId, categoryId };
    
    if (batteryIndex !== undefined) {
      where.batteryIndex = batteryIndex;
    }

    await this.repository.delete(where);
  }
} 