import { Repository } from 'typeorm';
import { Penalty, PenaltyType, PenaltyStatus } from '../models/penalty.entity';

export interface IPenaltyRepository {
  findByUserId(userId: string): Promise<Penalty[]>;
  findByChampionshipId(championshipId: string): Promise<Penalty[]>;
  findBySeasonId(seasonId: string): Promise<Penalty[]>;
  findByStageId(stageId: string): Promise<Penalty[]>;
  findByCategoryId(categoryId: string): Promise<Penalty[]>;
  findActivePenalties(userId: string, championshipId: string): Promise<Penalty[]>;
  findPendingPenalties(): Promise<Penalty[]>;
  findByType(type: PenaltyType): Promise<Penalty[]>;
  findByStatus(status: PenaltyStatus): Promise<Penalty[]>;
} 