import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database.config';
import { Stage } from '../models/stage.entity';
import { StageParticipation, ParticipationStatus } from '../models/stage-participation.entity';
import { CreateStageDto, UpdateStageDto } from '../dtos/stage.dto';
import { NotFoundException } from '../exceptions/not-found.exception';
import { BadRequestException } from '../exceptions/bad-request.exception';

export interface StageWithParticipants extends Stage {
  participants?: StageParticipation[];
  participantCount?: number;
}

export class StageService {
  private stageRepository: Repository<Stage>;
  private participationRepository: Repository<StageParticipation>;

  constructor() {
    this.stageRepository = AppDataSource.getRepository(Stage);
    this.participationRepository = AppDataSource.getRepository(StageParticipation);
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
    const stage = await this.stageRepository.findOne({
      where: { id }
    });

    if (!stage) {
      throw new NotFoundException('Etapa não encontrada');
    }

    // Buscar participantes confirmados
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
    // Validar se a temporada existe (isso deveria ser feito através de FK)
    
    // Converter a data string para Date object
    const dateObj = new Date(createStageDto.date);
    
    // Validar se a data não é no passado
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dateObj < today) {
      throw new BadRequestException('Não é possível criar etapa com data no passado');
    }

    // Verificar se já existe etapa no mesmo horário para a mesma temporada
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

    // Se briefingTime não foi fornecido, sugerir 30 minutos antes da etapa
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
    return this.formatTimeFields(savedStage);
  }

  /**
   * Atualizar etapa
   */
  async update(id: string, updateStageDto: UpdateStageDto): Promise<Stage> {
    const stage = await this.findById(id);

    // Se a data for alterada, validar
    if (updateStageDto.date) {
      const dateObj = new Date(updateStageDto.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dateObj < today) {
        throw new BadRequestException('Não é possível alterar etapa para data no passado');
      }

      // Verificar conflito de horário se data ou hora forem alteradas
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

    // Atualizar os campos fornecidos
    const updatedData: any = { ...updateStageDto };
    
    if (updateStageDto.date) {
      updatedData.date = new Date(updateStageDto.date);
    }

    await this.stageRepository.update(id, updatedData);
    
    return this.findById(id);
  }

  /**
   * Deletar etapa
   */
  async delete(id: string): Promise<void> {
    const stage = await this.findById(id);
    
    // Verificar se a etapa não é no passado (regra de negócio)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (stage.date < today) {
      throw new BadRequestException('Não é possível deletar etapa que já aconteceu');
    }

    await this.stageRepository.delete(id);
  }

  /**
   * Buscar etapas com pontuação em dobro por temporada
   */
  async findDoublePointsBySeasonId(seasonId: string): Promise<Stage[]> {
    const stages = await this.stageRepository.find({
      where: { 
        seasonId, 
        doublePoints: true 
      },
      order: { date: 'ASC', time: 'ASC' }
    });
    return stages.map(stage => this.formatTimeFields(stage));
  }

  /**
   * Contar etapas por temporada
   */
  async countBySeasonId(seasonId: string): Promise<number> {
    return this.stageRepository.count({
      where: { seasonId }
    });
  }

  /**
   * Buscar próxima etapa por temporada
   */
  async findNextBySeasonId(seasonId: string): Promise<Stage | null> {
    const today = new Date();
    
    const stage = await this.stageRepository
      .createQueryBuilder('stage')
      .where('stage.seasonId = :seasonId', { seasonId })
      .andWhere('(stage.date > :today OR (stage.date = :today AND stage.time > :currentTime))', {
        today: today.toISOString().split('T')[0],
        currentTime: today.toTimeString().split(' ')[0].substring(0, 5)
      })
      .orderBy('stage.date', 'ASC')
      .addOrderBy('stage.time', 'ASC')
      .getOne();
    
    return stage ? this.formatTimeFields(stage) : null;
  }
} 