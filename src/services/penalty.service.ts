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

    // Se for punição de desclassificação aplicada, adicionar o status DC ao resultado da etapa
    if (penalty.type === PenaltyType.DISQUALIFICATION && 
        penalty.status === PenaltyStatus.APPLIED &&
        penalty.stageId && 
        penalty.categoryId && 
        penalty.userId && 
        penalty.batteryIndex !== null) {
      
      try {
        // Importar StageService dinamicamente para evitar dependência circular
        const { StageService } = await import('./stage.service');
        const stageService = new StageService();
        
        // Buscar resultados atuais da etapa
        const stage = await stageService.findById(penalty.stageId);
        if (stage && stage.stage_results) {
          const results = { ...stage.stage_results };
          const catResults = results[penalty.categoryId] || {};
          const pilotResults = catResults[penalty.userId] || {};
          const batteryResults = pilotResults[penalty.batteryIndex] || {};

          // Adicionar o status DC
          const updatedBatteryResults = { ...batteryResults, status: 'dc' };
          const updatedPilotResults = { ...pilotResults, [penalty.batteryIndex]: updatedBatteryResults };
          const updatedCatResults = { ...catResults, [penalty.userId]: updatedPilotResults };
          const updatedResults = { ...results, [penalty.categoryId]: updatedCatResults };

          // Salvar resultados atualizados
          await stageService.updateStageResults(penalty.stageId, updatedResults);
          
          console.log(`✅ [PENALTY SERVICE] Status DC adicionado ao resultado da etapa ${penalty.stageId} (criação)`);

          // Recalcular posições após adicionar o status DC
          try {
            const { ChampionshipClassificationService } = await import('./championship-classification.service');
            const classificationService = new ChampionshipClassificationService();
            await classificationService.recalculateStagePositions(penalty.stageId, penalty.categoryId, penalty.batteryIndex);
            console.log(`✅ [PENALTY SERVICE] Posições recalculadas após adição do status DC`);
          } catch (recalcError) {
            console.error('❌ [PENALTY SERVICE] Erro ao recalcular posições após adição do status DC:', recalcError);
          }
        }
      } catch (error) {
        console.error('❌ [PENALTY SERVICE] Erro ao adicionar status DC ao resultado:', error);
        // Não falhar a operação se não conseguir adicionar o status
      }
    }

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

    // Se for punição de tempo, adicionar o tempo ao resultado da etapa
    if (penalty.type === PenaltyType.TIME_PENALTY && 
        penalty.stageId && 
        penalty.categoryId && 
        penalty.userId && 
        penalty.batteryIndex !== null &&
        penalty.timePenaltySeconds) {
      
      try {
        // Importar StageService dinamicamente para evitar dependência circular
        const { StageService } = await import('./stage.service');
        const stageService = new StageService();
        
        // Buscar resultados atuais da etapa
        const stage = await stageService.findById(penalty.stageId);
        if (stage && stage.stage_results) {
          const results = { ...stage.stage_results };
          const catResults = results[penalty.categoryId] || {};
          const pilotResults = catResults[penalty.userId] || {};
          const batteryResults = pilotResults[penalty.batteryIndex] || {};

          // Adicionar o tempo da punição ao penaltyTime
          const currentPenalty = batteryResults.penaltyTime ? parseInt(batteryResults.penaltyTime) : 0;
          const newPenalty = currentPenalty + penalty.timePenaltySeconds;

          // Atualizar resultado
          const updatedBatteryResults = { ...batteryResults, penaltyTime: newPenalty.toString() };
          const updatedPilotResults = { ...pilotResults, [penalty.batteryIndex]: updatedBatteryResults };
          const updatedCatResults = { ...catResults, [penalty.userId]: updatedPilotResults };
          const updatedResults = { ...results, [penalty.categoryId]: updatedCatResults };

          // Salvar resultados atualizados
          await stageService.updateStageResults(penalty.stageId, updatedResults);
          
          console.log(`✅ [PENALTY SERVICE] Tempo de punição adicionado ao resultado da etapa ${penalty.stageId}`);
        }
      } catch (error) {
        console.error('❌ [PENALTY SERVICE] Erro ao adicionar tempo de punição ao resultado:', error);
        // Não falhar a operação se não conseguir adicionar o tempo
      }
    }

    // Se for punição de desclassificação, adicionar o status DC ao resultado da etapa
    if (penalty.type === PenaltyType.DISQUALIFICATION && 
        penalty.stageId && 
        penalty.categoryId && 
        penalty.userId && 
        penalty.batteryIndex !== null) {
      
      try {
        // Importar StageService dinamicamente para evitar dependência circular
        const { StageService } = await import('./stage.service');
        const stageService = new StageService();
        
        // Buscar resultados atuais da etapa
        const stage = await stageService.findById(penalty.stageId);
        if (stage && stage.stage_results) {
          const results = { ...stage.stage_results };
          const catResults = results[penalty.categoryId] || {};
          const pilotResults = catResults[penalty.userId] || {};
          const batteryResults = pilotResults[penalty.batteryIndex] || {};

          // Adicionar o status DC
          const updatedBatteryResults = { ...batteryResults, status: 'dc' };
          const updatedPilotResults = { ...pilotResults, [penalty.batteryIndex]: updatedBatteryResults };
          const updatedCatResults = { ...catResults, [penalty.userId]: updatedPilotResults };
          const updatedResults = { ...results, [penalty.categoryId]: updatedCatResults };

          // Salvar resultados atualizados
          await stageService.updateStageResults(penalty.stageId, updatedResults);
          
          console.log(`✅ [PENALTY SERVICE] Status DC adicionado ao resultado da etapa ${penalty.stageId} (aplicação)`);

          // Recalcular posições após adicionar o status DC
          try {
            const { ChampionshipClassificationService } = await import('./championship-classification.service');
            const classificationService = new ChampionshipClassificationService();
            await classificationService.recalculateStagePositions(penalty.stageId, penalty.categoryId, penalty.batteryIndex);
            console.log(`✅ [PENALTY SERVICE] Posições recalculadas após adição do status DC`);
          } catch (recalcError) {
            console.error('❌ [PENALTY SERVICE] Erro ao recalcular posições após adição do status DC:', recalcError);
          }
        }
      } catch (error) {
        console.error('❌ [PENALTY SERVICE] Erro ao adicionar status DC ao resultado:', error);
        // Não falhar a operação se não conseguir adicionar o status
      }
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

    // Se for punição de tempo e estiver aplicada, remover o tempo do resultado da etapa
    if (penalty.type === PenaltyType.TIME_PENALTY && 
        penalty.status === PenaltyStatus.APPLIED &&
        penalty.stageId && 
        penalty.categoryId && 
        penalty.userId && 
        penalty.batteryIndex !== null &&
        penalty.timePenaltySeconds) {
      
      try {
        // Importar StageService dinamicamente para evitar dependência circular
        const { StageService } = await import('./stage.service');
        const stageService = new StageService();
        
        // Buscar resultados atuais da etapa
        const stage = await stageService.findById(penalty.stageId);
        if (stage && stage.stage_results) {
          const results = { ...stage.stage_results };
          const catResults = results[penalty.categoryId] || {};
          const pilotResults = catResults[penalty.userId] || {};
          const batteryResults = pilotResults[penalty.batteryIndex] || {};

          // Remover o tempo da punição do penaltyTime
          const currentPenalty = batteryResults.penaltyTime ? parseInt(batteryResults.penaltyTime) : 0;
          const newPenalty = Math.max(0, currentPenalty - penalty.timePenaltySeconds);

          // Atualizar resultado
          const updatedBatteryResults = { ...batteryResults, penaltyTime: newPenalty.toString() };
          const updatedPilotResults = { ...pilotResults, [penalty.batteryIndex]: updatedBatteryResults };
          const updatedCatResults = { ...catResults, [penalty.userId]: updatedPilotResults };
          const updatedResults = { ...results, [penalty.categoryId]: updatedCatResults };

          // Salvar resultados atualizados
          await stageService.updateStageResults(penalty.stageId, updatedResults);
          
          console.log(`✅ [PENALTY SERVICE] Tempo de punição removido do resultado da etapa ${penalty.stageId}`);
        }
      } catch (error) {
        console.error('❌ [PENALTY SERVICE] Erro ao remover tempo de punição do resultado:', error);
        // Não falhar a operação se não conseguir remover o tempo
      }
    }

    // Se for punição de desclassificação e estiver aplicada, remover o status DC do resultado da etapa
    if (penalty.type === PenaltyType.DISQUALIFICATION && 
        penalty.status === PenaltyStatus.APPLIED &&
        penalty.stageId && 
        penalty.categoryId && 
        penalty.userId && 
        penalty.batteryIndex !== null) {
      
      try {
        // Importar StageService dinamicamente para evitar dependência circular
        const { StageService } = await import('./stage.service');
        const stageService = new StageService();
        
        // Buscar resultados atuais da etapa
        const stage = await stageService.findById(penalty.stageId);
        if (stage && stage.stage_results) {
          const results = { ...stage.stage_results };
          const catResults = results[penalty.categoryId] || {};
          const pilotResults = catResults[penalty.userId] || {};
          const batteryResults = pilotResults[penalty.batteryIndex] || {};

          // Remover o status DC se existir
          const { status, ...updatedBatteryResults } = batteryResults;
          const updatedPilotResults = { ...pilotResults, [penalty.batteryIndex]: updatedBatteryResults };
          const updatedCatResults = { ...catResults, [penalty.userId]: updatedPilotResults };
          const updatedResults = { ...results, [penalty.categoryId]: updatedCatResults };

          // Salvar resultados atualizados
          await stageService.updateStageResults(penalty.stageId, updatedResults);
          
          console.log(`✅ [PENALTY SERVICE] Status DC removido do resultado da etapa ${penalty.stageId} (cancelamento)`);

          // Recalcular posições após remover o status DC
          try {
            const { ChampionshipClassificationService } = await import('./championship-classification.service');
            const classificationService = new ChampionshipClassificationService();
            await classificationService.recalculateStagePositions(penalty.stageId, penalty.categoryId, penalty.batteryIndex);
            console.log(`✅ [PENALTY SERVICE] Posições recalculadas após remoção do status DC`);
          } catch (recalcError) {
            console.error('❌ [PENALTY SERVICE] Erro ao recalcular posições após remoção do status DC:', recalcError);
          }
        }
      } catch (error) {
        console.error('❌ [PENALTY SERVICE] Erro ao remover status DC do resultado:', error);
        // Não falhar a operação se não conseguir remover o status
      }
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

    // Se for punição de tempo e estiver aplicada, remover o tempo do resultado da etapa
    if (penalty.type === PenaltyType.TIME_PENALTY && 
        penalty.status === PenaltyStatus.APPLIED &&
        penalty.stageId && 
        penalty.categoryId && 
        penalty.userId && 
        penalty.batteryIndex !== null &&
        penalty.timePenaltySeconds) {
      
      try {
        // Importar StageService dinamicamente para evitar dependência circular
        const { StageService } = await import('./stage.service');
        const stageService = new StageService();
        
        // Buscar resultados atuais da etapa
        const stage = await stageService.findById(penalty.stageId);
        if (stage && stage.stage_results) {
          const results = { ...stage.stage_results };
          const catResults = results[penalty.categoryId] || {};
          const pilotResults = catResults[penalty.userId] || {};
          const batteryResults = pilotResults[penalty.batteryIndex] || {};

          // Remover o tempo da punição do penaltyTime
          const currentPenalty = batteryResults.penaltyTime ? parseInt(batteryResults.penaltyTime) : 0;
          const newPenalty = Math.max(0, currentPenalty - penalty.timePenaltySeconds);

          // Atualizar resultado
          const updatedBatteryResults = { ...batteryResults, penaltyTime: newPenalty.toString() };
          const updatedPilotResults = { ...pilotResults, [penalty.batteryIndex]: updatedBatteryResults };
          const updatedCatResults = { ...catResults, [penalty.userId]: updatedPilotResults };
          const updatedResults = { ...results, [penalty.categoryId]: updatedCatResults };

          // Salvar resultados atualizados
          await stageService.updateStageResults(penalty.stageId, updatedResults);
          
          console.log(`✅ [PENALTY SERVICE] Tempo de punição removido do resultado da etapa ${penalty.stageId} (exclusão)`);
        }
      } catch (error) {
        console.error('❌ [PENALTY SERVICE] Erro ao remover tempo de punição do resultado:', error);
        // Não falhar a operação se não conseguir remover o tempo
      }
    }

    // Se for punição de desclassificação e estiver aplicada, remover o status DC do resultado da etapa
    if (penalty.type === PenaltyType.DISQUALIFICATION && 
        penalty.status === PenaltyStatus.APPLIED &&
        penalty.stageId && 
        penalty.categoryId && 
        penalty.userId && 
        penalty.batteryIndex !== null) {
      
      try {
        // Importar StageService dinamicamente para evitar dependência circular
        const { StageService } = await import('./stage.service');
        const stageService = new StageService();
        
        // Buscar resultados atuais da etapa
        const stage = await stageService.findById(penalty.stageId);
        if (stage && stage.stage_results) {
          const results = { ...stage.stage_results };
          const catResults = results[penalty.categoryId] || {};
          const pilotResults = catResults[penalty.userId] || {};
          const batteryResults = pilotResults[penalty.batteryIndex] || {};

          // Remover o status DC se existir
          const { status, ...updatedBatteryResults } = batteryResults;
          const updatedPilotResults = { ...pilotResults, [penalty.batteryIndex]: updatedBatteryResults };
          const updatedCatResults = { ...catResults, [penalty.userId]: updatedPilotResults };
          const updatedResults = { ...results, [penalty.categoryId]: updatedCatResults };

          // Salvar resultados atualizados
          await stageService.updateStageResults(penalty.stageId, updatedResults);
          
          console.log(`✅ [PENALTY SERVICE] Status DC removido do resultado da etapa ${penalty.stageId} (exclusão)`);

          // Recalcular posições após remover o status DC
          try {
            const { ChampionshipClassificationService } = await import('./championship-classification.service');
            const classificationService = new ChampionshipClassificationService();
            await classificationService.recalculateStagePositions(penalty.stageId, penalty.categoryId, penalty.batteryIndex);
            console.log(`✅ [PENALTY SERVICE] Posições recalculadas após remoção do status DC`);
          } catch (recalcError) {
            console.error('❌ [PENALTY SERVICE] Erro ao recalcular posições após remoção do status DC:', recalcError);
          }
        }
      } catch (error) {
        console.error('❌ [PENALTY SERVICE] Erro ao remover status DC do resultado:', error);
        // Não falhar a operação se não conseguir remover o status
      }
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
      isImported: penalty.isImported,
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