import { Repository } from 'typeorm';

import { AppDataSource } from '../config/database.config';
import { CreateStageDto, UpdateStageDto } from '../dtos/stage.dto';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { NotFoundException } from '../exceptions/not-found.exception';
import { Stage } from '../models/stage.entity';
import {
  ParticipationStatus,
  StageParticipation,
} from '../models/stage-participation.entity';
import { ChampionshipClassificationService } from './championship-classification.service';
import { RedisService } from './redis.service';
import { ScoringSystemService } from './scoring-system.service';

export interface StageWithParticipants extends Stage {
  participants?: StageParticipation[];
  participantCount?: number;
}

export interface StageCacheData {
  id: string;
  name: string;
  date: Date;
  time: string;
  raceTrackId: string;
  seasonId: string;
}

export class StageService {
  private stageRepository: Repository<Stage>;
  private participationRepository: Repository<StageParticipation>;
  private redisService: RedisService;
  private classificationService: ChampionshipClassificationService;
  private scoringSystemService: ScoringSystemService;
  private seasonRepository: Repository<any>;

  constructor() {
    this.stageRepository = AppDataSource.getRepository(Stage);
    this.participationRepository =
      AppDataSource.getRepository(StageParticipation);
    this.redisService = RedisService.getInstance();
    this.classificationService = new ChampionshipClassificationService();
    this.scoringSystemService = new ScoringSystemService();
    this.seasonRepository = AppDataSource.getRepository('Season');
  }

  /**
   * Formatar campos de hora para HH:MM
   */
  private formatTimeFields(stage: Stage): Stage {
    if (stage.time && stage.time.length > 5) {
      stage.time = stage.time.substring(0, 5);
    }
    if (stage.briefingTime && stage.briefingTime.length > 5) {
      stage.briefingTime = stage.briefingTime.substring(0, 5);
    }
    return stage;
  }

  /**
   * Buscar todas as etapas
   */
  async findAll(): Promise<Stage[]> {
    const stages = await this.stageRepository.find({
      order: { date: 'ASC', time: 'ASC' },
    });

    return stages.map(stage => this.formatTimeFields(stage));
  }

  /**
   * Buscar etapa por ID
   */
  async findById(id: string): Promise<Stage> {
    const stage = await this.stageRepository.findOne({
      where: { id },
    });

    if (!stage) {
      throw new NotFoundException('Etapa não encontrada');
    }

    return this.formatTimeFields(stage);
  }

  /**
   * Buscar etapa por ID com participantes confirmados
   */
  async findByIdWithParticipants(id: string): Promise<StageWithParticipants> {
    const stage = await this.findById(id);

    const participants = await this.participationRepository.find({
      where: {
        stageId: id,
        status: ParticipationStatus.CONFIRMED,
      },
      relations: ['user', 'category'],
      order: { confirmedAt: 'ASC' },
    });

    return {
      ...this.formatTimeFields(stage),
      participants,
      participantCount: participants.length,
    };
  }

  /**
   * Buscar etapas por temporada
   */
  async findBySeasonId(seasonId: string): Promise<Stage[]> {
    const stages = await this.stageRepository.find({
      where: { seasonId },
      order: { date: 'ASC', time: 'ASC' },
    });

    return stages.map(stage => this.formatTimeFields(stage));
  }

  /**
   * Buscar etapas por kartódromo (agora por raceTrackId)
   */
  async findByRaceTrackId(raceTrackId: string): Promise<Stage[]> {
    const stages = await this.stageRepository.find({
      where: { raceTrackId },
      order: { date: 'ASC', time: 'ASC' },
    });
    return stages.map(stage => this.formatTimeFields(stage));
  }

  /**
   * Buscar etapas por data
   */
  async findByDate(date: Date): Promise<Stage[]> {
    const stages = await this.stageRepository.find({
      where: { date },
      order: { time: 'ASC' },
    });
    return stages.map(stage => this.formatTimeFields(stage));
  }

  /**
   * Buscar etapas futuras por temporada
   */
  async findUpcomingBySeasonId(seasonId: string): Promise<Stage[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stages = await this.stageRepository
      .createQueryBuilder('stage')
      .where('stage.seasonId = :seasonId', { seasonId })
      .andWhere('stage.date >= :today', { today })
      .orderBy('stage.date', 'ASC')
      .addOrderBy('stage.time', 'ASC')
      .getMany();

    return stages.map(stage => this.formatTimeFields(stage));
  }

  /**
   * Buscar etapas passadas por temporada
   */
  async findPastBySeasonId(seasonId: string): Promise<Stage[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stages = await this.stageRepository
      .createQueryBuilder('stage')
      .where('stage.seasonId = :seasonId', { seasonId })
      .andWhere('stage.date < :today', { today })
      .orderBy('stage.date', 'DESC')
      .addOrderBy('stage.time', 'DESC')
      .getMany();

    return stages.map(stage => this.formatTimeFields(stage));
  }

  /**
   * Criar nova etapa
   */
  async create(createStageDto: CreateStageDto): Promise<Stage> {
    const dateObj = new Date(createStageDto.date);


    let briefingTime = createStageDto.briefingTime;
    if (!briefingTime) {
      const stageHour = parseInt(createStageDto.time.split(':')[0]);
      const stageMinute = parseInt(createStageDto.time.split(':')[1]);

      let briefingHour = stageHour;
      let briefingMinute = stageMinute - 30;

      if (briefingMinute < 0) {
        briefingMinute += 60;
        briefingHour -= 1;
      }

      if (briefingHour < 0) {
        briefingHour = 0;
        briefingMinute = 0;
      }

      briefingTime = `${briefingHour.toString().padStart(2, '0')}:${briefingMinute.toString().padStart(2, '0')}`;
    }

    // Valida par de rodada dupla
    let pairStage: Stage | null = null;
    if (createStageDto.doubleRound) {
      if (!createStageDto.doubleRoundPairId) {
        throw new BadRequestException(
          'doubleRoundPairId é obrigatório quando doubleRound é verdadeiro'
        );
      }
      // precisa existir e ser da mesma temporada
      pairStage = await this.stageRepository.findOne({
        where: { id: createStageDto.doubleRoundPairId },
      });
      if (!pairStage) {
        throw new BadRequestException('Etapa par de rodada dupla não encontrada');
      }
      if (pairStage.seasonId !== createStageDto.seasonId) {
        throw new BadRequestException(
          'A etapa par de rodada dupla deve pertencer à mesma temporada'
        );
      }
      if (
        pairStage.doubleRoundPairId &&
        pairStage.doubleRoundPairId !== createStageDto.id
      ) {
        // Se já está pareada com outra etapa, não permitir
        throw new BadRequestException(
          'A etapa selecionada já está marcada como rodada dupla com outra etapa'
        );
      }
    }

    const stage = this.stageRepository.create({
      ...createStageDto,
      date: dateObj,
      briefingTime,
    });

    const savedStage = await this.stageRepository.save(stage);

    // Sincroniza vínculo na etapa par
    if (createStageDto.doubleRound && pairStage) {
      // Atualiza par
      pairStage.doubleRound = true;
      pairStage.doubleRoundPairId = savedStage.id;
      await this.stageRepository.save(pairStage);
      await this.redisService.invalidateStageCache(pairStage.id, pairStage.seasonId);
    }

    return this.formatTimeFields(savedStage);
  }

  /**
   * Atualizar etapa
   */
  async update(id: string, updateStageDto: UpdateStageDto): Promise<Stage> {
    const stage = await this.findById(id);


    const { date, ...restOfDto } = updateStageDto;
    const updateData: Partial<Stage> = { ...restOfDto };

    if (date) {
      const isoDateString = date.toISOString().split('T')[0];
      const [year, month, day] = isoDateString.split('-').map(Number);
      updateData.date = new Date(Date.UTC(year, month - 1, day));
    }

    // Sincronização/validação de rodada dupla
    const wasDouble = !!stage.doubleRound;
    const wasPairedWith = stage.doubleRoundPairId || null;
    const willBeDouble = updateStageDto.doubleRound ?? stage.doubleRound;
    const requestedPairId = updateStageDto.doubleRoundPairId ?? wasPairedWith;

    if (willBeDouble) {
      if (!requestedPairId) {
        throw new BadRequestException(
          'doubleRoundPairId é obrigatório quando doubleRound é verdadeiro'
        );
      }
      const pair = await this.stageRepository.findOne({ where: { id: requestedPairId } });
      if (!pair) {
        throw new BadRequestException('Etapa par de rodada dupla não encontrada');
      }
      if (pair.seasonId !== stage.seasonId) {
        throw new BadRequestException(
          'A etapa par de rodada dupla deve pertencer à mesma temporada'
        );
      }
      if (pair.id === stage.id) {
        throw new BadRequestException('A etapa par não pode ser a própria etapa');
      }
      if (pair.doubleRoundPairId && pair.doubleRoundPairId !== stage.id) {
        throw new BadRequestException(
          'A etapa selecionada já está marcada como rodada dupla com outra etapa'
        );
      }
      // Se existia um par anterior diferente, desvincula
      if (wasPairedWith && wasPairedWith !== pair.id) {
        const oldPair = await this.stageRepository.findOne({ where: { id: wasPairedWith } });
        if (oldPair) {
          oldPair.doubleRound = false;
          oldPair.doubleRoundPairId = null;
          await this.stageRepository.save(oldPair);
          await this.redisService.invalidateStageCache(oldPair.id, oldPair.seasonId);
        }
      }
      // Garante recíproco no novo par
      pair.doubleRound = true;
      pair.doubleRoundPairId = stage.id;
      await this.stageRepository.save(pair);
      await this.redisService.invalidateStageCache(pair.id, pair.seasonId);
    } else {
      // Se vai deixar de ser dupla, remover vínculo no par anterior
      if (wasPairedWith) {
        const oldPair = await this.stageRepository.findOne({ where: { id: wasPairedWith } });
        if (oldPair) {
          oldPair.doubleRound = false;
          oldPair.doubleRoundPairId = null;
          await this.stageRepository.save(oldPair);
          await this.redisService.invalidateStageCache(oldPair.id, oldPair.seasonId);
        }
      }
    }

    // Aplica alterações locais
    if (!willBeDouble) {
      updateData.doubleRound = false;
      updateData.doubleRoundPairId = null;
    } else if (requestedPairId) {
      updateData.doubleRound = true;
      updateData.doubleRoundPairId = requestedPairId;
    }

    const updatedStage = this.stageRepository.merge(stage, updateData);
    const savedStage = await this.stageRepository.save(updatedStage);

    await this.redisService.invalidateStageCache(id, savedStage.seasonId);

    return this.formatTimeFields(savedStage);
  }

  /**
   * Atualizar cronograma da etapa
   */
  async updateSchedule(id: string, schedule: any): Promise<Stage> {
    const stage = await this.findById(id);

    stage.schedule = schedule;

    const updatedStage = await this.stageRepository.save(stage);

    // Limpar cache relacionado
    await this.redisService.deleteData(`stage:${id}`);
    await this.redisService.deleteData(`stages:season:${stage.seasonId}`);

    return this.formatTimeFields(updatedStage);
  }

  /**
   * Deletar etapa
   */
  async delete(id: string): Promise<void> {
    const stage = await this.findById(id);
    if (!stage) {
      throw new NotFoundException('Etapa não encontrada');
    }

    await this.stageRepository.delete(id);
    await this.redisService.invalidateStageCache(id, stage.seasonId);
  }

  /**
   * Buscar etapas com pontuação em dobro por temporada
   */
  async findDoublePointsBySeasonId(seasonId: string): Promise<Stage[]> {
    return this.stageRepository.find({
      where: { seasonId, doublePoints: true },
    });
  }

  /**
   * Contar etapas por temporada
   */
  async countBySeasonId(seasonId: string): Promise<number> {
    return this.stageRepository.count({ where: { seasonId } });
  }

  /**
   * Buscar próxima etapa por temporada
   */
  async findNextBySeasonId(seasonId: string): Promise<Stage | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.stageRepository
      .createQueryBuilder('stage')
      .where('stage.seasonId = :seasonId', { seasonId })
      .andWhere('stage.date >= :today', { today })
      .orderBy('stage.date', 'ASC')
      .addOrderBy('stage.time', 'ASC')
      .getOne();
  }

  /**
   * Atualizar sorteio de karts da etapa
   */
  async updateKartDrawAssignments(
    id: string,
    assignments: any
  ): Promise<Stage> {
    const stage = await this.findById(id);
    stage.kart_draw_assignments = assignments;
    const updatedStage = await this.stageRepository.save(stage);
    await this.redisService.invalidateStageCache(id, stage.seasonId);
    return this.formatTimeFields(updatedStage);
  }

  /**
   * Buscar sorteio de karts da etapa
   */
  async getKartDrawAssignments(id: string): Promise<any> {
    const stage = await this.findById(id);
    return stage.kart_draw_assignments || null;
  }

  /**
   * Atualizar resultados da etapa
   */
  async updateStageResults(id: string, results: any): Promise<Stage> {
    const stage = await this.findById(id);
    stage.stage_results = results;
    const updatedStage = await this.stageRepository.save(stage);

    // Invalidar cache da etapa
    await this.redisService.invalidateStageCache(id, stage.seasonId);

    // AUTOMATICAMENTE recalcular toda a classificação da temporada
    try {
      // Recalcular classificação completa da temporada
      await this.classificationService.recalculateSeasonClassification(
        stage.seasonId
      );

      // Persistir resultado no Redis usando o hash season:{seasonId}
      await this.persistClassificationToRedis(stage.seasonId);
    } catch (error) {
      console.error(
        '❌ [TRIGGER] Erro ao recalcular classificação da temporada:',
        error
      );
      // Não bloquear o salvamento dos resultados se houver erro na classificação
    }

    return this.formatTimeFields(updatedStage);
  }

  /**
   * Persistir classificação no Redis usando hash season:{seasonId}
   */
  private async persistClassificationToRedis(seasonId: string): Promise<void> {
    try {
      // Buscar classificação completa da temporada
      const classificationData =
        await this.classificationService.getSeasonClassificationOptimized(
          seasonId
        );

      if (classificationData) {
        // Persistir no Redis usando o método existente
        await this.redisService.cacheSeasonClassification(
          seasonId,
          classificationData
        );
      }
    } catch (error) {
      console.error(
        '❌ [REDIS] Erro ao persistir classificação no Redis:',
        error
      );
      throw error;
    }
  }

  // Método removido - agora usa recalculateSeasonClassification() diretamente para evitar redundância

  /**
   * Calcular pontos baseado na posição e sistema de pontuação
   */
  private calculatePointsForPosition(
    position: number,
    scoringPositions: Array<{ position: number; points: number }>
  ): number {
    const scoringPosition = scoringPositions.find(
      sp => sp.position === position
    );
    return scoringPosition ? scoringPosition.points : 0;
  }

  /**
   * Converter tempo de volta para milissegundos
   */
  private convertLapTimeToMs(lapTime: string): number {
    try {
      // Formato pode ser: "47.123" ou "1:23.456"
      if (lapTime.includes(':')) {
        // Formato MM:SS.sss
        const [minutes, seconds] = lapTime.split(':');
        return (parseFloat(minutes) * 60 + parseFloat(seconds)) * 1000;
      } else {
        // Formato SS.sss
        return parseFloat(lapTime) * 1000;
      }
    } catch (error) {
      console.error('Erro ao converter tempo de volta:', lapTime, error);
      return 0;
    }
  }

  /**
   * Buscar resultados da etapa
   */
  async getStageResults(id: string): Promise<any> {
    const stage = await this.findById(id);
    return stage.stage_results || null;
  }
}
