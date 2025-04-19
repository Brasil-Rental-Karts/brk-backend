import { DeepPartial } from 'typeorm';
import { BaseService } from './base.service';
import { Penalty } from '../models/penalty.entity';
import { PenaltyRepository } from '../repositories/penalty.repository';
import { HttpException } from '../middleware/error.middleware';
import { ResultService } from './result.service';

export enum PenaltyType {
  TIME_PENALTY = 'Time Penalty',
  POINTS_DEDUCTION = 'Points Deduction',
  DISQUALIFICATION = 'Disqualification',
  WARNING = 'Warning'
}

export class PenaltyService extends BaseService<Penalty> {
  constructor(
    private penaltyRepository: PenaltyRepository,
    private resultService: ResultService
  ) {
    super(penaltyRepository);
  }

  async findByResultId(resultId: string): Promise<Penalty[]> {
    const penalties = await this.findAll();
    return penalties.filter(penalty => penalty.result && penalty.result.id === resultId);
  }

  async findAll(): Promise<Penalty[]> {
    return super.findAll();
  }

  async findById(id: string): Promise<Penalty | null> {
    return super.findById(id);
  }

  async create(penaltyData: DeepPartial<Penalty>): Promise<Penalty> {
    // Validate required fields
    if (!penaltyData.result || !penaltyData.result.id) {
      throw new HttpException(400, 'Result must be provided');
    }

    // Validate result exists
    const resultId = penaltyData.result.id;
    const result = await this.resultService.findById(resultId);
    if (!result) {
      throw new HttpException(404, 'Result not found');
    }

    // Apply penalty effects based on type
    if (penaltyData.type === PenaltyType.DISQUALIFICATION) {
      // Disqualify the pilot in the result
      await this.resultService.disqualifyPilot(
        resultId, 
        penaltyData.description as string || 'Disqualification penalty applied'
      );
    } else if (penaltyData.type === PenaltyType.POINTS_DEDUCTION && penaltyData.pointsDeducted) {
      // Deduct points from the result
      const newPoints = Math.max(0, (result.points || 0) - penaltyData.pointsDeducted);
      await this.resultService.update(resultId, { points: newPoints });
    }
    // Time penalties would affect the lap time, but that's more complex
    // and would require recalculating positions, which would be handled in a more comprehensive implementation

    return super.create(penaltyData);
  }

  async update(id: string, penaltyData: DeepPartial<Penalty>): Promise<Penalty | null> {
    // Check penalty exists
    const penalty = await this.findById(id);
    if (!penalty) {
      throw new HttpException(404, 'Penalty not found');
    }

    // If type is changing, we need to handle the changes in effects
    if (penaltyData.type && penaltyData.type !== penalty.type) {
      // Revert old penalty effects
      if (penalty.type === PenaltyType.DISQUALIFICATION && penalty.result) {
        // This is complex and would require more knowledge of the business rules
        // Ideally, we would store original state before applying penalties to allow proper rollback
      }

      // Apply new effects
      if (penaltyData.type === PenaltyType.DISQUALIFICATION && penalty.result) {
        await this.resultService.disqualifyPilot(
          penalty.result.id,
          penaltyData.description as string || penalty.description || 'Disqualification penalty updated'
        );
      }
    }

    // Handle updates to penalty points
    if (penaltyData.pointsDeducted !== undefined && 
        penalty.pointsDeducted !== penaltyData.pointsDeducted && 
        penalty.result) {
      const result = await this.resultService.findById(penalty.result.id);
      if (result) {
        // Calculate what points would be without the old penalty
        const originalPoints = result.points + (penalty.pointsDeducted || 0);
        // Apply the new penalty deduction
        const newPoints = Math.max(0, originalPoints - (penaltyData.pointsDeducted || 0));
        await this.resultService.update(penalty.result.id, { points: newPoints });
      }
    }

    return super.update(id, penaltyData);
  }

  async delete(id: string): Promise<boolean> {
    // Check penalty exists
    const penalty = await this.findById(id);
    if (!penalty) {
      throw new HttpException(404, 'Penalty not found');
    }

    // Reverting effects of penalties would involve complex business logic
    // and potentially need to recalculate results, positions, etc.
    // This is a simplified implementation

    return super.delete(id);
  }
}