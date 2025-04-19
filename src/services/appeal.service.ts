import { DeepPartial } from 'typeorm';
import { BaseService } from './base.service';
import { Appeal } from '../models/appeal.entity';
import { AppealRepository } from '../repositories/appeal.repository';
import { HttpException } from '../middleware/error.middleware';
import { PenaltyService } from './penalty.service';
import { PilotService } from './pilot.service';

export enum AppealStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  WITHDRAWN = 'Withdrawn'
}

export class AppealService extends BaseService<Appeal> {
  constructor(
    private appealRepository: AppealRepository,
    private penaltyService: PenaltyService,
    private pilotService: PilotService
  ) {
    super(appealRepository);
  }

  async findByPilotId(pilotId: string): Promise<Appeal[]> {
    const appeals = await this.findAll();
    return appeals.filter(appeal => appeal.filedBy && appeal.filedBy.id === pilotId);
  }

  async findByPenaltyId(penaltyId: string): Promise<Appeal | null> {
    const appeals = await this.findAll();
    return appeals.find(appeal => appeal.penalty && appeal.penalty.id === penaltyId) || null;
  }

  async findByStatus(status: AppealStatus): Promise<Appeal[]> {
    const appeals = await this.findAll();
    return appeals.filter(appeal => appeal.status === status);
  }

  async findAll(): Promise<Appeal[]> {
    return super.findAll();
  }

  async findById(id: string): Promise<Appeal | null> {
    return super.findById(id);
  }

  async create(appealData: DeepPartial<Appeal>): Promise<Appeal> {
    // Validate required fields
    if (!appealData.penalty || !appealData.penalty.id) {
      throw new HttpException(400, 'Penalty must be provided');
    }

    if (!appealData.filedBy || !appealData.filedBy.id) {
      throw new HttpException(400, 'Pilot filing the appeal must be provided');
    }

    // Check if penalty exists
    const penaltyId = appealData.penalty.id;
    const penalty = await this.penaltyService.findById(penaltyId);
    if (!penalty) {
      throw new HttpException(404, 'Penalty not found');
    }

    // Check if pilot exists
    const pilotId = appealData.filedBy.id;
    const pilot = await this.pilotService.findById(pilotId);
    if (!pilot) {
      throw new HttpException(404, 'Pilot not found');
    }

    // Check if an appeal for this penalty already exists
    const existingAppeal = await this.findByPenaltyId(penaltyId);
    if (existingAppeal) {
      throw new HttpException(409, 'An appeal for this penalty already exists');
    }

    // Set default values if not provided
    if (!appealData.filingDate) {
      appealData.filingDate = new Date();
    }

    if (!appealData.status) {
      appealData.status = AppealStatus.PENDING;
    }

    return super.create(appealData);
  }

  async update(id: string, appealData: DeepPartial<Appeal>): Promise<Appeal | null> {
    // Check appeal exists
    const appeal = await this.findById(id);
    if (!appeal) {
      throw new HttpException(404, 'Appeal not found');
    }

    // Business rules for appeal updates
    if (appealData.status) {
      const newStatus = appealData.status as AppealStatus;
      
      // Only allow certain status transitions
      if (appeal.status === AppealStatus.PENDING) {
        // From PENDING we can go to any status
      } else if (appeal.status === AppealStatus.WITHDRAWN) {
        // Cannot change status once withdrawn
        throw new HttpException(400, 'Cannot change status of a withdrawn appeal');
      } else if (appeal.status === AppealStatus.APPROVED || appeal.status === AppealStatus.REJECTED) {
        // Cannot change once finalized, unless for admin override (would need role checks)
        throw new HttpException(400, 'Cannot change status of a finalized appeal');
      }

      // If approving the appeal, potentially reverse the penalty
      if (newStatus === AppealStatus.APPROVED) {
        // In a real system, we would have logic to reverse the penalty's effects
        // This would depend on the exact business rules of the application
        if (!appealData.resolution) {
          appealData.resolution = 'Appeal approved. Penalty revoked.';
        }
        appealData.resolutionDate = new Date();
      }

      // If rejecting the appeal, potentially take additional actions
      if (newStatus === AppealStatus.REJECTED) {
        if (!appealData.resolution) {
          appealData.resolution = 'Appeal rejected. Original penalty stands.';
        }
        appealData.resolutionDate = new Date();
      }
    }

    return super.update(id, appealData);
  }

  async delete(id: string): Promise<boolean> {
    // Check appeal exists
    const appeal = await this.findById(id);
    if (!appeal) {
      throw new HttpException(404, 'Appeal not found');
    }

    // Business rule: Don't allow deletion of appeals in certain statuses
    if (appeal.status === AppealStatus.APPROVED || appeal.status === AppealStatus.REJECTED) {
      throw new HttpException(400, 'Cannot delete finalized appeals');
    }

    return super.delete(id);
  }
  
  async withdrawAppeal(id: string, reason?: string): Promise<Appeal | null> {
    // Check appeal exists
    const appeal = await this.findById(id);
    if (!appeal) {
      throw new HttpException(404, 'Appeal not found');
    }
    
    // Can only withdraw pending appeals
    if (appeal.status !== AppealStatus.PENDING) {
      throw new HttpException(400, 'Only pending appeals can be withdrawn');
    }
    
    // Add resolution with reason if provided
    let resolution = 'Appeal withdrawn by pilot.';
    if (reason) {
      resolution += ` Reason: ${reason}`;
    }
    
    return this.update(id, {
      status: AppealStatus.WITHDRAWN,
      resolution,
      resolutionDate: new Date()
    });
  }
}