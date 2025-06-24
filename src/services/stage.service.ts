import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database.config';
import { Stage } from '../models/stage.entity';
import { StageParticipation, ParticipationStatus } from '../models/stage-participation.entity';
import { CreateStageDto, UpdateStageDto } from '../dtos/stage.dto';
import { NotFoundException } from '../exceptions/not-found.exception';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { DatabaseChangeEventsService } from './database-change-events.service';

export interface StageWithParticipants extends Stage {
  participants?: StageParticipation[];
  participantCount?: number;
}

export interface StageCacheData {
  id: string;
  name: string;
  date: Date;
  time: string;
  kartodrome: string;
  seasonId: string;
}

export class StageService {
  private stageRepository: Repository<Stage>;
  private participationRepository: Repository<StageParticipation>;
  private databaseEventsService: DatabaseChangeEventsService;

  constructor() {
    this.stageRepository = AppDataSource.getRepository(Stage);
    this.participationRepository = AppDataSource.getRepository(StageParticipation);
    this.databaseEventsService = DatabaseChangeEventsService.getInstance();
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
      order: { date: 'ASC', time: 'ASC' }
    });
    return stages.map(stage => this.formatTimeFields(stage));
  }

  /**
   * Buscar etapa por ID
   */
  async findById(id: string): Promise<Stage> {
    const stage = await this.stageRepository.findOne({
      where: { id }
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
        status: ParticipationStatus.CONFIRMED 
      },
      relations: ['user', 'category'],
      order: { confirmedAt: 'ASC' }
    });

    return {
      ...this.formatTimeFields(stage),
      participants,
      participantCount: participants.length
    };
  }

  /**
   * Buscar etapas por temporada
   */
  async findBySeasonId(seasonId: string): Promise<Stage[]> {
    const stages = await this.stageRepository.find({
      where: { seasonId },
      order: { date: 'ASC', time: 'ASC' }
    });
    
    return stages.map(stage => this.formatTimeFields(stage));
  }

  /**
   * Buscar etapas por kartódromo
   */
  async findByKartodrome(kartodrome: string): Promise<Stage[]> {
    const stages = await this.stageRepository.find({
      where: { kartodrome },
      order: { date: 'ASC', time: 'ASC' }
    });
    return stages.map(stage => this.formatTimeFields(stage));
  }

  /**
   * Buscar etapas por data
   */
  async findByDate(date: Date): Promise<Stage[]> {
    const stages = await this.stageRepository.find({
      where: { date },
      order: { time: 'ASC' }
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
    console.log('aqui ta essa data:', dateObj);
    
    const existingStage = await this.stageRepository.findOne({
      where: {
        seasonId: createStageDto.seasonId,
        date: dateObj,
        time: createStageDto.time
      }
    });

    if (existingStage) {
      throw new BadRequestException('Já existe uma etapa agendada para esta data e horário');
    }
    
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

    const stage = this.stageRepository.create({
      ...createStageDto,
      date: dateObj,
      briefingTime
    });

    const savedStage = await this.stageRepository.save(stage);
    
    // Publish database change event
    await this.databaseEventsService.onEntityChange('INSERT', 'Stage', {
      id: savedStage.id,
      name: savedStage.name,
      date: savedStage.date.toISOString(),
      time: savedStage.time,
      kartodrome: savedStage.kartodrome,
      streamLink: savedStage.streamLink,
      briefing: savedStage.briefing,
      briefingTime: savedStage.briefingTime,
      seasonId: savedStage.seasonId,
      doublePoints: savedStage.doublePoints
    });
    
    return this.formatTimeFields(savedStage);
  }

  /**
   * Atualizar etapa
   */
  async update(id: string, updateStageDto: UpdateStageDto): Promise<Stage> {
    const stage = await this.findById(id);

    if (updateStageDto.date) {
      const dateObj = new Date(updateStageDto.date);
      console.log('aqui ta essa data:', dateObj);

      const checkDate = updateStageDto.date ? dateObj : stage.date;
      const checkTime = updateStageDto.time || stage.time;

      const existingStage = await this.stageRepository
        .createQueryBuilder('stage')
        .where('stage.seasonId = :seasonId', { seasonId: stage.seasonId })
        .andWhere('stage.date = :date', { date: checkDate })
        .andWhere('stage.time = :time', { time: checkTime })
        .andWhere('stage.id != :id', { id })
        .getOne();

      if (existingStage) {
        throw new BadRequestException('Já existe uma etapa agendada para esta data e horário');
      }
    }

    const { date, ...restOfDto } = updateStageDto;
    const updateData: Partial<Stage> = { ...restOfDto };

    if (date) {
      const isoDateString = date.toISOString().split('T')[0];
      const [year, month, day] = isoDateString.split('-').map(Number);
      updateData.date = new Date(Date.UTC(year, month - 1, day));
    }
    
    const updatedStage = this.stageRepository.merge(stage, updateData);
    const savedStage = await this.stageRepository.save(updatedStage);
    
    // Publish database change event
    await this.databaseEventsService.onEntityChange('UPDATE', 'Stage', {
      id: savedStage.id,
      name: savedStage.name,
      date: savedStage.date.toISOString(),
      time: savedStage.time,
      kartodrome: savedStage.kartodrome,
      streamLink: savedStage.streamLink,
      briefing: savedStage.briefing,
      briefingTime: savedStage.briefingTime,
      seasonId: savedStage.seasonId,
      doublePoints: savedStage.doublePoints
    });

    return this.formatTimeFields(savedStage);
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
    
    // Publish database change event
    await this.databaseEventsService.onEntityChange('DELETE', 'Stage', {
      id: stage.id,
      name: stage.name,
      seasonId: stage.seasonId
    });
  }

  /**
   * Buscar etapas com pontuação em dobro por temporada
   */
  async findDoublePointsBySeasonId(seasonId: string): Promise<Stage[]> {
    return this.stageRepository.find({
      where: { seasonId, doublePoints: true }
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
   * Métodos que anteriormente usavam cache agora consultam diretamente o banco
   */
  async getStageBasicInfo(id: string): Promise<StageCacheData | null> {
    try {
      const stage = await this.findById(id);
      
      return {
        id: stage.id,
        name: stage.name,
        date: stage.date,
        time: stage.time,
        kartodrome: stage.kartodrome,
        seasonId: stage.seasonId
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Buscar múltiplas etapas por IDs
   */
  async getMultipleStagesBasicInfo(ids: string[]): Promise<StageCacheData[]> {
    try {
      const stages = await this.stageRepository.findByIds(ids);
      
      return stages.map(stage => ({
        id: stage.id,
        name: stage.name,
        date: stage.date,
        time: stage.time,
        kartodrome: stage.kartodrome,
        seasonId: stage.seasonId
      }));
    } catch (error) {
      console.error('Error getting multiple stages:', error);
      return [];
    }
  }

  /**
   * Buscar etapas por temporada (substitui consulta de cache)
   */
  async getSeasonStages(seasonId: string): Promise<StageCacheData[]> {
    try {
      const stages = await this.findBySeasonId(seasonId);
      
      return stages.map(stage => ({
        id: stage.id,
        name: stage.name,
        date: stage.date,
        time: stage.time,
        kartodrome: stage.kartodrome,
        seasonId: stage.seasonId
      }));
    } catch (error) {
      console.error('Error getting season stages:', error);
      return [];
    }
  }
}