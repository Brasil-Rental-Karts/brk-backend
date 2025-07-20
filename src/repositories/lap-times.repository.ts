import { BaseRepository } from './base.repository';
import { LapTimes, LapTime } from '../models/lap-times.entity';

export interface LapTimesRepository extends BaseRepository<LapTimes> {
  findByStageId(stageId: string): Promise<LapTimes[]>;
  findByStageAndCategory(stageId: string, categoryId: string): Promise<LapTimes[]>;
  findByUserStageCategory(userId: string, stageId: string, categoryId: string, batteryIndex?: number): Promise<LapTimes | null>;
  saveLapTimes(
    userId: string, 
    stageId: string, 
    categoryId: string, 
    batteryIndex: number, 
    kartNumber: number, 
    lapTimes: LapTime[]
  ): Promise<LapTimes>;
  deleteLapTimes(userId: string, stageId: string, categoryId: string, batteryIndex?: number): Promise<void>;
  deleteLapTimesByCategoryAndBattery(stageId: string, categoryId: string, batteryIndex: number): Promise<void>;
} 