import { Repository } from 'typeorm';
import { Stage } from '../models/stage.entity';
import { StageParticipation, ParticipationStatus } from '../models/stage-participation.entity';
import { CreateStageDto, UpdateStageDto } from '../dtos/stage.dto';
import { NotFoundException } from '../exceptions/not-found.exception';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { RedisService } from './redis.service';
import { AppDataSource } from '../config/database.config';
import { ConflictException } from '../exceptions/conflict.exception';
import { ChampionshipClassificationService, StageResultData } from './championship-classification.service';
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
    this.participationRepository = AppDataSource.getRepository(StageParticipation);
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
   * Buscar etapas por kartódromo (agora por raceTrackId)
   */
  async findByRaceTrackId(raceTrackId: string): Promise<Stage[]> {
    const stages = await this.stageRepository.find({
      where: { raceTrackId },
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
    
    const existingStage = await this.stageRepository.findOne({
      where: {
        seasonId: createStageDto.seasonId,
        date: dateObj
      }
    });

    if (existingStage) {
      throw new ConflictException('Já existe uma etapa cadastrada para esta data nesta temporada.');
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
    
    return this.formatTimeFields(savedStage);
  }

  /**
   * Atualizar etapa
   */
  async update(id: string, updateStageDto: UpdateStageDto): Promise<Stage> {
    const stage = await this.findById(id);

    if (updateStageDto.date) {
      const dateObj = new Date(updateStageDto.date);

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
   * Atualizar sorteio de karts da etapa
   */
  async updateKartDrawAssignments(id: string, assignments: any): Promise<Stage> {
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
    await this.redisService.invalidateStageCache(id, stage.seasonId);
    
    // Atualizar classificação baseada nos resultados
    try {
      await this.updateClassificationFromResults(id, results);
    } catch (error) {
      console.error('Erro ao atualizar classificação:', error);
      // Não bloquear o salvamento dos resultados se houver erro na classificação
    }
    
    return this.formatTimeFields(updatedStage);
  }

  /**
   * Atualizar classificação baseada nos resultados da etapa
   */
  private async updateClassificationFromResults(stageId: string, results: any): Promise<void> {
    console.log('🔧 [DEBUG] Iniciando updateClassificationFromResults');
    console.log('🔧 [DEBUG] stageId:', stageId);
    console.log('🔧 [DEBUG] results:', JSON.stringify(results, null, 2));

    if (!results || typeof results !== 'object') {
      console.log('❌ [DEBUG] Resultados inválidos ou não é objeto');
      return;
    }

    // Buscar informações da etapa
    console.log('🔧 [DEBUG] Buscando informações da etapa...');
    const stage = await this.stageRepository.findOne({
      where: { id: stageId }
    });

    if (!stage) {
      console.error('❌ [DEBUG] Etapa não encontrada');
      return;
    }

    console.log('✅ [DEBUG] Etapa encontrada:', stage.name, 'seasonId:', stage.seasonId);

    // Buscar informações da temporada
    console.log('🔧 [DEBUG] Buscando informações da temporada...');
    const season = await this.seasonRepository.findOne({
      where: { id: stage.seasonId },
      relations: ['championship']
    });

    if (!season) {
      console.error('❌ [DEBUG] Temporada não encontrada');
      return;
    }

    console.log('✅ [DEBUG] Temporada encontrada:', season.name, 'championshipId:', season.championshipId);

    // Buscar sistema de pontuação padrão do campeonato
    console.log('🔧 [DEBUG] Buscando sistema de pontuação...');
    const scoringSystems = await this.scoringSystemService.findByChampionship(season.championshipId);
    console.log('🔧 [DEBUG] Sistemas encontrados:', scoringSystems.length);
    
    const defaultScoringSystem = scoringSystems.find(ss => ss.isDefault && ss.isActive) || scoringSystems.find(ss => ss.isActive);
    
    if (!defaultScoringSystem) {
      console.error('❌ [DEBUG] Sistema de pontuação não encontrado para o campeonato');
      return;
    }

    console.log('✅ [DEBUG] Sistema de pontuação encontrado:', defaultScoringSystem.name);
    console.log('🔧 [DEBUG] Posições do sistema:', JSON.stringify(defaultScoringSystem.positions, null, 2));

    const stageResults: StageResultData[] = [];

    // Processar resultados por categoria
    console.log('🔧 [DEBUG] Processando resultados por categoria...');
    for (const [categoryId, categoryPilots] of Object.entries(results)) {
      console.log('🔧 [DEBUG] Processando categoria:', categoryId);
      
      if (!categoryPilots || typeof categoryPilots !== 'object') {
        console.log('⚠️ [DEBUG] Categoria inválida ou sem pilotos');
        continue;
      }

      // Coletar dados de todos os pilotos da categoria
      const categoryResults: Array<{
        userId: string;
        startPosition?: number;
        finishPosition?: number;
        bestLap?: string;
        bestLapMs?: number;
      }> = [];

      // Processar cada piloto
      console.log('🔧 [DEBUG] Processando pilotos da categoria...');
      for (const [pilotId, pilotBatteries] of Object.entries(categoryPilots as any)) {
        console.log('🔧 [DEBUG] Processando piloto:', pilotId);
        
        if (!pilotBatteries || typeof pilotBatteries !== 'object') {
          console.log('⚠️ [DEBUG] Piloto sem dados de bateria');
          continue;
        }

        // Para cada bateria do piloto, coletar os melhores resultados
        let bestStartPosition: number | undefined;
        let bestFinishPosition: number | undefined;
        let bestLapTime: string | undefined;
        let bestLapMs: number | undefined;

        console.log('🔧 [DEBUG] Processando baterias do piloto...');
        for (const [batteryIndex, batteryData] of Object.entries(pilotBatteries as any)) {
          console.log('🔧 [DEBUG] Bateria:', batteryIndex, 'dados:', JSON.stringify(batteryData, null, 2));
          
          if (!batteryData || typeof batteryData !== 'object') {
            console.log('⚠️ [DEBUG] Dados da bateria inválidos');
            continue;
          }

          const typedBatteryData = batteryData as {
            startPosition?: number;
            finishPosition?: number;
            bestLap?: string;
            weight?: boolean;
          };

          // Pegar melhor posição de largada (menor número = melhor)
          if (typedBatteryData.startPosition && (typeof typedBatteryData.startPosition === 'number')) {
            console.log('🔧 [DEBUG] Posição de largada encontrada:', typedBatteryData.startPosition);
            if (!bestStartPosition || typedBatteryData.startPosition < bestStartPosition) {
              bestStartPosition = typedBatteryData.startPosition;
            }
          }

          // Pegar melhor posição de chegada (menor número = melhor)
          if (typedBatteryData.finishPosition && (typeof typedBatteryData.finishPosition === 'number')) {
            console.log('🔧 [DEBUG] Posição de chegada encontrada:', typedBatteryData.finishPosition);
            if (!bestFinishPosition || typedBatteryData.finishPosition < bestFinishPosition) {
              bestFinishPosition = typedBatteryData.finishPosition;
            }
          }

          // Pegar melhor volta (menor tempo = melhor)
          if (typedBatteryData.bestLap && typeof typedBatteryData.bestLap === 'string') {
            console.log('🔧 [DEBUG] Melhor volta encontrada:', typedBatteryData.bestLap);
            const lapTimeMs = this.convertLapTimeToMs(typedBatteryData.bestLap);
            if (lapTimeMs > 0 && (!bestLapMs || lapTimeMs < bestLapMs)) {
              bestLapTime = typedBatteryData.bestLap;
              bestLapMs = lapTimeMs;
            }
          }
        }

        console.log('🔧 [DEBUG] Resumo do piloto:', {
          pilotId,
          bestStartPosition,
          bestFinishPosition,
          bestLapTime,
          bestLapMs
        });

        categoryResults.push({
          userId: pilotId,
          startPosition: bestStartPosition,
          finishPosition: bestFinishPosition,
          bestLap: bestLapTime,
          bestLapMs: bestLapMs
        });
      }

      console.log('🔧 [DEBUG] Resultados da categoria processados:', categoryResults.length, 'pilotos');

      // Determinar pole position (melhor largada)
      const validStartPositions = categoryResults
        .filter(r => r.startPosition)
        .map(r => r.startPosition!);
      const bestStartPosition = validStartPositions.length > 0 ? Math.min(...validStartPositions) : undefined;
      console.log('🔧 [DEBUG] Melhor posição de largada:', bestStartPosition);
      
      // Determinar volta mais rápida
      const validLapTimes = categoryResults
        .filter(r => r.bestLapMs)
        .map(r => r.bestLapMs!);
      const bestLapMs = validLapTimes.length > 0 ? Math.min(...validLapTimes) : undefined;
      console.log('🔧 [DEBUG] Melhor tempo de volta (ms):', bestLapMs);

      // Converter para formato do ChampionshipClassificationService
      console.log('🔧 [DEBUG] Convertendo para formato de classificação...');
      for (const result of categoryResults) {
        // Só processar se tem posição de chegada (resultado da corrida)
        if (!result.finishPosition) {
          console.log('⚠️ [DEBUG] Piloto sem posição de chegada, pulando:', result.userId);
          continue;
        }

        // Calcular pontos baseado na posição de chegada
        const positionPoints = this.calculatePointsForPosition(result.finishPosition, defaultScoringSystem.positions);
        console.log('🔧 [DEBUG] Pontos por posição:', positionPoints, 'para posição:', result.finishPosition);
        
        // Pontos extras
        const polePositionPoints = (bestStartPosition && result.startPosition === bestStartPosition && result.startPosition === 1) 
          ? defaultScoringSystem.polePositionPoints : 0;
        const fastestLapPoints = (bestLapMs && result.bestLapMs === bestLapMs && result.bestLapMs > 0) 
          ? defaultScoringSystem.fastestLapPoints : 0;

        const totalPoints = positionPoints + polePositionPoints + fastestLapPoints;

        console.log('🔧 [DEBUG] Pontos calculados para', result.userId, ':', {
          positionPoints,
          polePositionPoints,
          fastestLapPoints,
          totalPoints
        });

        const stageResult: StageResultData = {
          userId: result.userId,
          categoryId: categoryId,
          position: result.finishPosition,
          points: totalPoints,
          polePosition: bestStartPosition ? (result.startPosition === bestStartPosition && result.startPosition === 1) : false,
          fastestLap: bestLapMs ? (result.bestLapMs === bestLapMs && result.bestLapMs > 0) : false,
          dnf: false, // TODO: implementar lógica para DNF baseado em algum campo
          dsq: false  // TODO: implementar lógica para DSQ baseado em algum campo
        };

        console.log('🔧 [DEBUG] Resultado final criado:', JSON.stringify(stageResult, null, 2));
        stageResults.push(stageResult);
      }
    }

    console.log('🔧 [DEBUG] Total de resultados para classificação:', stageResults.length);

    // Atualizar classificação se há resultados válidos
    if (stageResults.length > 0) {
      console.log('✅ [DEBUG] Chamando updateClassificationFromStageResults...');
      try {
        await this.classificationService.updateClassificationFromStageResults(stageId, stageResults);
        console.log('✅ [DEBUG] Classificação atualizada com sucesso!');
      } catch (error) {
        console.error('❌ [DEBUG] Erro ao atualizar classificação:', error);
        throw error;
      }
    } else {
      console.log('⚠️ [DEBUG] Nenhum resultado válido para atualizar classificação');
    }
  }

  /**
   * Calcular pontos baseado na posição e sistema de pontuação
   */
  private calculatePointsForPosition(position: number, scoringPositions: Array<{ position: number; points: number }>): number {
    const scoringPosition = scoringPositions.find(sp => sp.position === position);
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