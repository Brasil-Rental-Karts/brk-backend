import { Penalty, PenaltyType, PenaltyStatus } from '../models/penalty.entity';
import { PenaltyRepositoryImpl } from '../repositories/penalty.repository.impl';
import { CreatePenaltyDto, UpdatePenaltyDto, AppealPenaltyDto, PenaltyResponseDto } from '../dtos/penalty.dto';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { NotFoundException } from '../exceptions/not-found.exception';

export class PenaltyService {
  constructor(private penaltyRepository: PenaltyRepositoryImpl) {}

  async createPenalty(data: CreatePenaltyDto, appliedByUserId: string): Promise<PenaltyResponseDto> {
    // Validar se o tipo de punição tem os campos necessários
    this.validatePenaltyData(data);

    const penalty = await this.penaltyRepository.create({
      ...data,
      appliedByUserId,
      status: data.status || PenaltyStatus.APPLIED,
    });

    return this.mapToResponseDto(penalty);
  }

  async updatePenalty(id: string, data: UpdatePenaltyDto): Promise<PenaltyResponseDto> {
    const penalty = await this.penaltyRepository.findById(id);
    if (!penalty) {
      throw new NotFoundException('Penalty not found');
    }

    const updatedPenalty = await this.penaltyRepository.update(id, data);
    if (!updatedPenalty) {
      throw new NotFoundException('Failed to update penalty');
    }

    return this.mapToResponseDto(updatedPenalty);
  }

  async applyPenalty(id: string): Promise<PenaltyResponseDto> {
    const penalty = await this.penaltyRepository.findById(id);
    if (!penalty) {
      throw new NotFoundException('Penalty not found');
    }

    // Permitir aplicar se estiver não aplicada ou recorrida
    if (penalty.status !== PenaltyStatus.NOT_APPLIED && penalty.status !== PenaltyStatus.APPEALED) {
      throw new BadRequestException('Penalty can only be applied if it is not applied or appealed');
    }

    const updatedPenalty = await this.penaltyRepository.update(id, {
      status: PenaltyStatus.APPLIED,
    });

    if (!updatedPenalty) {
      throw new NotFoundException('Failed to update penalty');
    }

    return this.mapToResponseDto(updatedPenalty);
  }

  async cancelPenalty(id: string): Promise<PenaltyResponseDto> {
    const penalty = await this.penaltyRepository.findById(id);
    if (!penalty) {
      throw new NotFoundException('Penalty not found');
    }

    if (penalty.status === PenaltyStatus.NOT_APPLIED) {
      throw new BadRequestException('Penalty is already not applied');
    }

    const updatedPenalty = await this.penaltyRepository.update(id, {
      status: PenaltyStatus.NOT_APPLIED,
    });

    if (!updatedPenalty) {
      throw new NotFoundException('Failed to update penalty');
    }

    return this.mapToResponseDto(updatedPenalty);
  }

  async appealPenalty(id: string, data: AppealPenaltyDto, appealedByUserId: string): Promise<PenaltyResponseDto> {
    const penalty = await this.penaltyRepository.findById(id);
    if (!penalty) {
      throw new NotFoundException('Penalty not found');
    }

    // Permitir recorrer se estiver aplicada ou não aplicada
    if (penalty.status !== PenaltyStatus.APPLIED && penalty.status !== PenaltyStatus.NOT_APPLIED) {
      throw new BadRequestException('Only applied or not applied penalties can be appealed');
    }

    const updatedPenalty = await this.penaltyRepository.update(id, {
      status: PenaltyStatus.APPEALED,
      appealReason: data.appealReason,
      appealedByUserId,
    });

    if (!updatedPenalty) {
      throw new NotFoundException('Failed to update penalty');
    }

    return this.mapToResponseDto(updatedPenalty);
  }

  async getPenaltyById(id: string): Promise<PenaltyResponseDto> {
    const penalty = await this.penaltyRepository.findById(id);
    if (!penalty) {
      throw new NotFoundException('Penalty not found');
    }

    return this.mapToResponseDto(penalty);
  }

  async getPenaltiesByUserId(userId: string): Promise<PenaltyResponseDto[]> {
    const penalties = await this.penaltyRepository.findByUserId(userId);
    return penalties.map(penalty => this.mapToResponseDto(penalty));
  }

  async getPenaltiesByChampionshipId(championshipId: string): Promise<PenaltyResponseDto[]> {
    const penalties = await this.penaltyRepository.findByChampionshipId(championshipId);
    return penalties.map(penalty => this.mapToResponseDto(penalty));
  }

  async getPenaltiesBySeasonId(seasonId: string): Promise<PenaltyResponseDto[]> {
    const penalties = await this.penaltyRepository.findBySeasonId(seasonId);
    return penalties.map(penalty => this.mapToResponseDto(penalty));
  }

  async getPenaltiesByStageId(stageId: string): Promise<PenaltyResponseDto[]> {
    const penalties = await this.penaltyRepository.findByStageId(stageId);
    return penalties.map(penalty => this.mapToResponseDto(penalty));
  }

  async getPenaltiesByCategoryId(categoryId: string): Promise<PenaltyResponseDto[]> {
    const penalties = await this.penaltyRepository.findByCategoryId(categoryId);
    return penalties.map(penalty => this.mapToResponseDto(penalty));
  }

  async getActivePenalties(userId: string, championshipId: string): Promise<PenaltyResponseDto[]> {
    const penalties = await this.penaltyRepository.findActivePenalties(userId, championshipId);
    return penalties.map(penalty => this.mapToResponseDto(penalty));
  }

  async getPendingPenalties(): Promise<PenaltyResponseDto[]> {
    const penalties = await this.penaltyRepository.findPendingPenalties();
    return penalties.map(penalty => this.mapToResponseDto(penalty));
  }

  async getPenaltiesByType(type: PenaltyType): Promise<PenaltyResponseDto[]> {
    const penalties = await this.penaltyRepository.findByType(type);
    return penalties.map(penalty => this.mapToResponseDto(penalty));
  }

  async getPenaltiesByStatus(status: PenaltyStatus): Promise<PenaltyResponseDto[]> {
    const penalties = await this.penaltyRepository.findByStatus(status);
    return penalties.map(penalty => this.mapToResponseDto(penalty));
  }

  async deletePenalty(id: string): Promise<boolean> {
    const penalty = await this.penaltyRepository.findById(id);
    if (!penalty) {
      throw new NotFoundException('Penalty not found');
    }

    return this.penaltyRepository.delete(id);
  }

  private validatePenaltyData(data: CreatePenaltyDto): void {
    switch (data.type) {
      case PenaltyType.TIME_PENALTY:
        if (!data.timePenaltySeconds || data.timePenaltySeconds <= 0) {
          throw new BadRequestException('Time penalty requires positive time penalty seconds');
        }
        break;
      case PenaltyType.POSITION_PENALTY:
        if (!data.positionPenalty || data.positionPenalty <= 0) {
          throw new BadRequestException('Position penalty requires positive position penalty');
        }
        break;
    }
  }

  private mapToResponseDto(penalty: Penalty): PenaltyResponseDto {
    return {
      id: penalty.id,
      type: penalty.type,
      status: penalty.status,
      reason: penalty.reason,
      description: penalty.description,
      timePenaltySeconds: penalty.timePenaltySeconds,
      positionPenalty: penalty.positionPenalty,
      batteryIndex: penalty.batteryIndex,
      userId: penalty.userId,
      championshipId: penalty.championshipId,
      seasonId: penalty.seasonId,
      stageId: penalty.stageId,
      categoryId: penalty.categoryId,
      appliedByUserId: penalty.appliedByUserId,
      appealReason: penalty.appealReason,
      appealedByUserId: penalty.appealedByUserId,
      createdAt: penalty.createdAt,
      updatedAt: penalty.updatedAt,
      user: penalty.user ? {
        id: penalty.user.id,
        name: penalty.user.name,
        email: penalty.user.email,
      } : undefined,
      appliedByUser: penalty.appliedByUser ? {
        id: penalty.appliedByUser.id,
        name: penalty.appliedByUser.name,
        email: penalty.appliedByUser.email,
      } : undefined,
      appealedByUser: penalty.appealedByUser ? {
        id: penalty.appealedByUser.id,
        name: penalty.appealedByUser.name,
        email: penalty.appealedByUser.email,
      } : undefined,
      championship: penalty.championship ? {
        id: penalty.championship.id,
        name: penalty.championship.name,
      } : undefined,
      season: penalty.season ? {
        id: penalty.season.id,
        name: penalty.season.name,
      } : undefined,
      stage: penalty.stage ? {
        id: penalty.stage.id,
        name: penalty.stage.name,
      } : undefined,
      category: penalty.category ? {
        id: penalty.category.id,
        name: penalty.category.name,
      } : undefined,
    };
  }
} 