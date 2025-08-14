import { In, Repository } from 'typeorm';

import { AppDataSource } from '../config/database.config';
import { Category } from '../models/category.entity';
import { Championship } from '../models/championship.entity';
import { ChampionshipClassification } from '../models/championship-classification.entity';
import { MemberProfile } from '../models/member-profile.entity';
import { ScoringSystem } from '../models/scoring-system.entity';
import { Season } from '../models/season.entity';
import { Stage } from '../models/stage.entity';
import { User } from '../models/user.entity';
import { RedisService } from './redis.service';

// Função para formatar nomes em CamelCase
function formatName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  return name
    .trim()
    .split(/\s+/)
    .map(word => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .filter(word => word.length > 0)
    .join(' ');
}

import { NotFoundException } from '../exceptions/not-found.exception';

export interface StageResultData {
  userId: string;
  categoryId: string;
  position: number;
  points: number;
  polePosition?: boolean;
  fastestLap?: boolean;
  fastestLapCount?: number;
  dnf?: boolean;
  dsq?: boolean;
}

export interface ClassificationData {
  userId: string;
  categoryId: string;
  seasonId: string;
  championshipId: string;
  totalPoints: number;
  totalStages: number;
  wins: number;
  podiums: number;
  polePositions: number;
  fastestLaps: number;
  bestPosition: number | null;
  averagePosition: number | null;
  user?: User;
  category?: Category;
}

export class ChampionshipClassificationService {
  private classificationRepository: Repository<ChampionshipClassification>;
  private scoringSystemRepository: Repository<ScoringSystem>;
  private stageRepository: Repository<Stage>;
  private seasonRepository: Repository<Season>;
  private categoryRepository: Repository<Category>;
  private userRepository: Repository<User>;
  private championshipRepository: Repository<Championship>;
  private memberProfileRepository: Repository<MemberProfile>;
  private redisService: RedisService;

  constructor() {
    this.classificationRepository = AppDataSource.getRepository(
      ChampionshipClassification
    );
    this.scoringSystemRepository = AppDataSource.getRepository(ScoringSystem);
    this.stageRepository = AppDataSource.getRepository(Stage);
    this.seasonRepository = AppDataSource.getRepository(Season);
    this.categoryRepository = AppDataSource.getRepository(Category);
    this.userRepository = AppDataSource.getRepository(User);
    this.championshipRepository = AppDataSource.getRepository(Championship);
    this.memberProfileRepository = AppDataSource.getRepository(MemberProfile);
    this.redisService = RedisService.getInstance();
  }

  /**
   * Atualizar a classificação baseado nos resultados de uma etapa
   */
  async updateClassificationFromStageResults(
    stageId: string,
    results: StageResultData[]
  ): Promise<void> {
    const stage = await this.stageRepository.findOne({
      where: { id: stageId },
    });

    if (!stage) {
      throw new NotFoundException('Etapa não encontrada');
    }

    const season = await this.seasonRepository.findOne({
      where: { id: stage.seasonId },
      relations: ['championship'],
    });

    if (!season) {
      throw new NotFoundException('Temporada não encontrada');
    }

    const championship = season.championship;
    // Buscar todas as etapas da temporada UMA SÓ VEZ
    const allStages = await this.stageRepository
      .createQueryBuilder('stage')
      .where('stage.seasonId = :seasonId', { seasonId: season.id })
      .andWhere('stage.stage_results IS NOT NULL')
      .andWhere('stage.stage_results != :emptyJson', { emptyJson: '{}' })
      .getMany();

    // Agrupar resultados por categoria
    const resultsByCategory = new Map<string, StageResultData[]>();
    for (const result of results) {
      if (!resultsByCategory.has(result.categoryId)) {
        resultsByCategory.set(result.categoryId, []);
      }
      resultsByCategory.get(result.categoryId)!.push(result);
    }

    // Processar todas as categorias
    for (const [categoryId, categoryResults] of resultsByCategory) {
      await this.updateCategoryClassificationOptimized(
        season.id,
        championship.id,
        categoryId,
        allStages
      );

      // Redis removido - classificação sempre buscada do banco
    }
  }

  /**
   * Atualizar classificação de uma categoria específica (versão otimizada)
   */
  private async updateCategoryClassificationOptimized(
    seasonId: string,
    championshipId: string,
    categoryId: string,
    allStages: Stage[]
  ): Promise<void> {
    // Coletar todos os resultados históricos da categoria
    const allResults = new Map<
      string,
      {
        totalPoints: number;
        totalStages: number;
        wins: number;
        podiums: number;
        polePositions: number;
        fastestLaps: number;
        positions: number[];
      }
    >();

    // Carregar categoria e mapear sistemas de pontuação por bateria
    const category = await this.categoryRepository.findOne({ where: { id: categoryId } });

    // Fallback: sistema padrão do campeonato (se necessário)
    const defaultScoringSystem = await this.scoringSystemRepository.findOne({
      where: { championshipId, isDefault: true },
    }) || (await this.scoringSystemRepository.findOne({ where: { championshipId, isActive: true } }));

    // Construir mapa batteryIndex -> scoringSystem
    const scoringSystemByBattery = new Map<string, ScoringSystem>();
    if (category?.batteriesConfig && Array.isArray(category.batteriesConfig)) {
      // Mapear orders para ids
      const scoringIds = Array.from(new Set(
        category.batteriesConfig
          .map(b => b.scoringSystemId)
          .filter(Boolean)
      ));

      if (scoringIds.length > 0) {
        const scoringSystems = await this.scoringSystemRepository.find({
          where: { id: In(scoringIds) as any },
        });
        const byId = new Map(scoringSystems.map(ss => [ss.id, ss]));
        category.batteriesConfig.forEach((battery, index) => {
          const ss = byId.get(battery.scoringSystemId);
          if (!ss) return;
          // Cobrir diferentes convenções de índice usadas em stage_results
          const keysToMap = new Set<string>();
          // 0-based pelo array
          keysToMap.add(String(index));
          // order informado (pode ser 0-based ou 1-based dependendo de quem preencheu)
          if (battery.order !== undefined && battery.order !== null) {
            keysToMap.add(String(battery.order));
            // se for 1-based, também mapear order-1
            keysToMap.add(String(Math.max(0, battery.order - 1)));
          }
          for (const key of keysToMap) {
            scoringSystemByBattery.set(key, ss);
          }
        });
      }
    }

    // Processar cada etapa
    for (const stage of allStages) {
      const stageResultsData = stage.stage_results;

      if (!stageResultsData || !stageResultsData[categoryId]) {
        continue;
      }

      const categoryStageResults = stageResultsData[categoryId];

      // Processar cada bateria individualmente para calcular pódios corretamente
      const batteryResults: {
        batteryIndex: string;
        pilotId: string;
        data: any;
      }[] = [];

      // Coletar todos os resultados de todas as baterias
      for (const [pilotId, pilotData] of Object.entries(categoryStageResults)) {
        for (const [batteryIndex, batteryData] of Object.entries(
          pilotData as any
        )) {
          const data = batteryData as any;

          if (
            data.finishPosition !== undefined &&
            data.finishPosition !== null
          ) {
            batteryResults.push({
              batteryIndex,
              pilotId,
              data,
            });
          }
        }
      }

      // Agrupar resultados por bateria para calcular pódios por bateria
      const batteriesByIndex = new Map<
        string,
        Array<{ pilotId: string; data: any }>
      >();

      for (const result of batteryResults) {
        const { batteryIndex, pilotId, data } = result;

        if (!batteriesByIndex.has(batteryIndex)) {
          batteriesByIndex.set(batteryIndex, []);
        }

        batteriesByIndex.get(batteryIndex)!.push({ pilotId, data });
      }

      // Calcular pódios por bateria
      const podiumsByBattery = new Map<string, Set<string>>();

      for (const [batteryIndex, batteryPilots] of batteriesByIndex) {
        // Ordenar pilotos desta bateria por posição de chegada
        const sortedPilots = batteryPilots.sort(
          (a, b) => a.data.finishPosition - b.data.finishPosition
        );

        // Os 5 primeiros são pódio (1º, 2º, 3º, 4º, 5º)
        const podiumPilots = sortedPilots.slice(0, 5);
        const podiumPilotIds = new Set(podiumPilots.map(p => p.pilotId));
        podiumsByBattery.set(batteryIndex, podiumPilotIds);
      }

      // Processar o formato real dos dados: { pilotId: { batteryIndex: { data } } }
      const processedResults = await this.processStageResultsData(
        categoryId,
        categoryStageResults,
        scoringSystemByBattery,
        defaultScoringSystem || undefined
      );

      // Processar resultados da etapa
      for (const result of processedResults) {
        const userId = result.userId;
        if (!userId) continue;

        if (!allResults.has(userId)) {
          allResults.set(userId, {
            totalPoints: 0,
            totalStages: 0,
            wins: 0,
            podiums: 0,
            polePositions: 0,
            fastestLaps: 0,
            positions: [],
          });
        }

        const userStats = allResults.get(userId)!;
        userStats.totalPoints += result.points || 0;
        userStats.totalStages += 1;

        // Calcular vitórias e pódios por bateria
        let stageWins = 0;
        let stagePodiums = 0;

        // Verificar cada bateria para este piloto
        for (const [batteryIndex, podiumPilotIds] of podiumsByBattery) {
          const pilotBatteryData = batteryResults.find(
            r => r.pilotId === userId && r.batteryIndex === batteryIndex
          );
          if (pilotBatteryData) {
            const position = pilotBatteryData.data.finishPosition;
            if (position === 1) stageWins += 1;
            if (podiumPilotIds.has(userId)) stagePodiums += 1;
          }
        }

        userStats.wins += stageWins;
        userStats.podiums += stagePodiums;

        // Contar poles por bateria (assim como pódios)
        let stagePoles = 0;
        for (const [batteryIndex, podiumPilotIds] of podiumsByBattery) {
          const pilotBatteryData = batteryResults.find(
            r => r.pilotId === userId && r.batteryIndex === batteryIndex
          );
          if (pilotBatteryData) {
            const startPosition = pilotBatteryData.data.startPosition;
            if (startPosition !== undefined && startPosition !== null) {
              // Verificar se esta bateria teve pole position (melhor largada da bateria)
              const batteryBestStartPosition = Math.min(
                ...batteryResults
                  .filter(r => r.batteryIndex === batteryIndex)
                  .map(r => r.data.startPosition)
                  .filter(pos => pos !== undefined && pos !== null)
              );
              if (startPosition === batteryBestStartPosition) {
                stagePoles += 1;
              }
            }
          }
        }
        userStats.polePositions += stagePoles;

        if (result.fastestLapCount)
          userStats.fastestLaps += result.fastestLapCount;

        userStats.positions.push(result.position);
      }
    }

    // Atualizar registros de classificação
    for (const [userId, stats] of allResults) {
      const bestPosition =
        stats.positions.length > 0 ? Math.min(...stats.positions) : null;
      const averagePosition =
        stats.positions.length > 0
          ? stats.positions.reduce((sum, pos) => sum + pos, 0) /
            stats.positions.length
          : null;

      await this.upsertClassification({
        userId,
        categoryId,
        seasonId,
        championshipId,
        totalPoints: stats.totalPoints,
        totalStages: stats.totalStages,
        wins: stats.wins,
        podiums: stats.podiums,
        polePositions: stats.polePositions,
        fastestLaps: stats.fastestLaps,
        bestPosition,
        averagePosition,
      });
    }
  }

  /**
   * Atualizar classificação de uma categoria específica (método original - manter por compatibilidade)
   */
  private async updateCategoryClassification(
    seasonId: string,
    championshipId: string,
    categoryId: string,
    stageResults: StageResultData[]
  ): Promise<void> {
    // Buscar todas as etapas da temporada
    const allStages = await this.stageRepository
      .createQueryBuilder('stage')
      .where('stage.seasonId = :seasonId', { seasonId })
      .andWhere('stage.stage_results IS NOT NULL')
      .andWhere('stage.stage_results != :emptyJson', { emptyJson: '{}' })
      .getMany();

    // Usar o método otimizado
    await this.updateCategoryClassificationOptimized(
      seasonId,
      championshipId,
      categoryId,
      allStages
    );
  }

  /**
   * Processar dados raw de resultados de etapa
   */
  private async processStageResultsData(
    categoryId: string,
    categoryData: any,
    scoringSystemByBattery: Map<string, ScoringSystem>,
    defaultScoringSystem?: ScoringSystem
  ): Promise<StageResultData[]> {
    // Armazenar resultados de cada bateria separadamente
    const batteryResults: {
      batteryIndex: string;
      pilotId: string;
      data: any;
    }[] = [];

    // Armazenar todas as entradas por bateria (inclusive pilotos sem finishPosition)
    const allBatteryEntries: {
      batteryIndex: string;
      pilotId: string;
      data: any;
    }[] = [];

    // Coletar todos os resultados de todas as baterias
    for (const [pilotId, pilotData] of Object.entries(categoryData)) {
      for (const [batteryIndex, batteryData] of Object.entries(
        pilotData as any
      )) {
        const data = batteryData as any;

        // Sempre registrar nas entradas completas da bateria
        allBatteryEntries.push({ batteryIndex, pilotId, data });

        // Para pontuação, considerar apenas quem tem finishPosition
        if (data.finishPosition !== undefined && data.finishPosition !== null) {
          batteryResults.push({
            batteryIndex,
            pilotId,
            data,
          });
        }
      }
    }

    // Agrupar pontos por piloto (somar pontos de todas as baterias)
    const pilotTotalPoints = new Map<
      string,
      {
        totalPoints: number;
        batteryCount: number;
        bestPosition: number;
        bestStartPosition?: number;
        bestLapTime?: string;
        bestLapMs: number;
        polePosition: boolean;
        fastestLapCount: number;
        positions: number[];
      }
    >();

    // Determinar pole position por bateria considerando todas as entradas
    const polePilotByBattery = new Map<string, string>();
    for (const { batteryIndex, pilotId, data } of allBatteryEntries) {
      if (data.startPosition !== undefined && data.startPosition !== null) {
        const currentPolePilot = polePilotByBattery.get(batteryIndex);
        if (!currentPolePilot) {
          polePilotByBattery.set(batteryIndex, pilotId);
        } else {
          // Comparar posições de largada para definir pole
          const currentPoleEntry = allBatteryEntries.find(
            e => e.batteryIndex === batteryIndex && e.pilotId === currentPolePilot
          );
          const currentPoleStart = currentPoleEntry?.data?.startPosition ?? Infinity;
          if (data.startPosition < currentPoleStart) {
            polePilotByBattery.set(batteryIndex, pilotId);
          }
        }
      }
    }

    // Agrupar resultados por bateria para encontrar fastest lap de cada bateria
    const batteriesByIndex = new Map<
      string,
      Array<{ pilotId: string; data: any }>
    >();

    for (const result of batteryResults) {
      const { batteryIndex, pilotId, data } = result;

      if (!batteriesByIndex.has(batteryIndex)) {
        batteriesByIndex.set(batteryIndex, []);
      }

      batteriesByIndex.get(batteryIndex)!.push({ pilotId, data });
    }

    // Encontrar fastest lap de cada bateria
    const fastestLapByBattery = new Map<
      string,
      { pilotId: string; lapTimeMs: number }
    >();

    for (const [batteryIndex, batteryPilots] of batteriesByIndex) {
      let fastestLapMs = Infinity;
      let fastestLapPilot = '';

      for (const { pilotId, data } of batteryPilots) {
        if (data.bestLap) {
          const lapTimeMs = this.convertLapTimeToMs(data.bestLap);
          if (lapTimeMs < fastestLapMs) {
            fastestLapMs = lapTimeMs;
            fastestLapPilot = pilotId;
          }
        }
      }

      if (fastestLapPilot) {
        fastestLapByBattery.set(batteryIndex, {
          pilotId: fastestLapPilot,
          lapTimeMs: fastestLapMs,
        });
      }
    }

    // Segunda passagem: calcular pontos de cada bateria
    for (const result of batteryResults) {
      const { pilotId, data, batteryIndex } = result;

      if (!pilotTotalPoints.has(pilotId)) {
        pilotTotalPoints.set(pilotId, {
          totalPoints: 0,
          batteryCount: 0,
          bestPosition: Infinity,
          bestStartPosition: undefined,
          bestLapTime: undefined,
          bestLapMs: Infinity,
          polePosition: false,
          fastestLapCount: 0,
          positions: [],
        });
      }

      const pilotStats = pilotTotalPoints.get(pilotId)!;

      // Selecionar sistema de pontuação desta bateria (fallback para default)
      const scoringSystem =
        scoringSystemByBattery.get(String(batteryIndex)) || defaultScoringSystem;

      // Calcular pontos da bateria
      const position = data.finishPosition;
      const positionPoints = scoringSystem
        ? this.getPointsForPosition(position, scoringSystem)
        : 0;

      // Verificar se este piloto é o pole desta bateria
      const hasPoleInThisBattery = polePilotByBattery.get(batteryIndex) === pilotId;

      // Verificar se este piloto teve fastest lap nesta bateria específica
      const batteryFastestLap = fastestLapByBattery.get(batteryIndex);
      const hasFastestLapInThisBattery =
        batteryFastestLap && batteryFastestLap.pilotId === pilotId;

      // Pontos adicionais
      let polePositionPoints = 0;
      let fastestLapPoints = 0;

      if (hasPoleInThisBattery) {
        polePositionPoints = scoringSystem?.polePositionPoints || 0;
        // Marcar que este piloto teve ao menos uma pole (para StageResultData)
        pilotStats.polePosition = pilotStats.polePosition || true;
      }

      if (hasFastestLapInThisBattery) {
        fastestLapPoints = scoringSystem?.fastestLapPoints || 0;
        pilotStats.fastestLapCount += 1;
      }

      const batteryTotalPoints =
        positionPoints + polePositionPoints + fastestLapPoints;

      // Acumular pontos e estatísticas
      pilotStats.totalPoints += batteryTotalPoints;
      pilotStats.batteryCount += 1;
      pilotStats.bestPosition = Math.min(pilotStats.bestPosition, position);
      pilotStats.positions.push(position);

      // Atualizar melhor largada e melhor tempo
      if (data.startPosition !== undefined && data.startPosition !== null) {
        if (
          pilotStats.bestStartPosition === undefined ||
          data.startPosition < pilotStats.bestStartPosition
        ) {
          pilotStats.bestStartPosition = data.startPosition;
        }
      }

      if (data.bestLap) {
        const lapTimeMs = this.convertLapTimeToMs(data.bestLap);
        if (lapTimeMs < pilotStats.bestLapMs) {
          pilotStats.bestLapMs = lapTimeMs;
          pilotStats.bestLapTime = data.bestLap;
        }
      }
    }

    // Converter para formato final
    const results: StageResultData[] = [];

    for (const [pilotId, stats] of pilotTotalPoints) {
      results.push({
        userId: pilotId,
        categoryId,
        position: stats.bestPosition, // Melhor posição para ordenação
        points: stats.totalPoints, // SOMA de todas as baterias
        polePosition: stats.polePosition,
        fastestLap: stats.fastestLapCount > 0,
        fastestLapCount: stats.fastestLapCount,
        dnf: false,
        dsq: false,
      });
    }

    // Ordenar por pontos (maior primeiro) e depois por melhor posição
    results.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points; // Maior pontuação primeiro
      }
      return a.position - b.position; // Melhor posição primeiro em caso de empate
    });

    return results;
  }

  /**
   * Converter tempo de volta para milissegundos
   */
  private convertLapTimeToMs(lapTime: string): number {
    if (!lapTime) return Infinity;

    const parts = lapTime.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]);
      const seconds = parseFloat(parts[1]);
      return (minutes * 60 + seconds) * 1000;
    }

    return parseFloat(lapTime) * 1000;
  }

  /**
   * Obter pontos para uma posição específica
   */
  private getPointsForPosition(
    position: number,
    scoringSystem: ScoringSystem
  ): number {
    const positionConfig = scoringSystem.positions?.find(
      p => p.position === position
    );
    return positionConfig?.points || 0;
  }

  /**
   * Inserir ou atualizar classificação
   */
  private async upsertClassification(data: {
    userId: string;
    categoryId: string;
    seasonId: string;
    championshipId: string;
    totalPoints: number;
    totalStages: number;
    wins: number;
    podiums: number;
    polePositions: number;
    fastestLaps: number;
    bestPosition: number | null;
    averagePosition: number | null;
  }): Promise<ChampionshipClassification> {
    const existingClassification = await this.classificationRepository.findOne({
      where: {
        userId: data.userId,
        categoryId: data.categoryId,
        seasonId: data.seasonId,
      },
    });

    let savedClassification: ChampionshipClassification;

    if (existingClassification) {
      // Atualizar classificação existente
      existingClassification.totalPoints = data.totalPoints;
      existingClassification.totalStages = data.totalStages;
      existingClassification.wins = data.wins;
      existingClassification.podiums = data.podiums;
      existingClassification.polePositions = data.polePositions;
      existingClassification.fastestLaps = data.fastestLaps;
      existingClassification.bestPosition = data.bestPosition;
      existingClassification.averagePosition = data.averagePosition;
      existingClassification.lastCalculatedAt = new Date();

      savedClassification = await this.classificationRepository.save(
        existingClassification
      );
    } else {
      // Criar nova classificação
      const classification = this.classificationRepository.create({
        ...data,
        lastCalculatedAt: new Date(),
      });

      savedClassification =
        await this.classificationRepository.save(classification);
    }

    // Redis removido - classificação sempre buscada do banco
    return savedClassification;
  }

  /**
   * Buscar classificação por temporada e categoria
   */
  async getClassificationBySeasonAndCategory(
    seasonId: string,
    categoryId: string
  ): Promise<ClassificationData[]> {
    // Redis removido - sempre buscar do banco de dados
    const classifications = await this.classificationRepository.find({
      where: {
        seasonId,
        categoryId,
      },
      relations: ['user', 'category'],
      order: {
        totalPoints: 'DESC',
        wins: 'DESC',
        podiums: 'DESC',
        bestPosition: 'ASC',
      },
    });

    const classificationData: ClassificationData[] = classifications.map(c => ({
      userId: c.userId,
      categoryId: c.categoryId,
      seasonId: c.seasonId,
      championshipId: c.championshipId,
      totalPoints: c.totalPoints,
      totalStages: c.totalStages,
      wins: c.wins,
      podiums: c.podiums,
      polePositions: c.polePositions,
      fastestLaps: c.fastestLaps,
      bestPosition: c.bestPosition,
      averagePosition: c.averagePosition,
      user: c.user,
      category: c.category,
    }));

    return classificationData;
  }

  /**
   * Buscar classificação por campeonato
   */
  async getClassificationByChampionship(
    championshipId: string
  ): Promise<Map<string, ClassificationData[]>> {
    // Redis removido - sempre buscar do banco de dados
    const classifications = await this.classificationRepository.find({
      where: {
        championshipId,
      },
      relations: ['user', 'category', 'season'],
      order: {
        totalPoints: 'DESC',
        wins: 'DESC',
        podiums: 'DESC',
        bestPosition: 'ASC',
      },
    });

    // Agrupar por temporada e categoria
    const classificationBySeasonCategory = new Map<
      string,
      ClassificationData[]
    >();

    for (const classification of classifications) {
      const key = `${classification.seasonId}-${classification.categoryId}`;
      if (!classificationBySeasonCategory.has(key)) {
        classificationBySeasonCategory.set(key, []);
      }

      classificationBySeasonCategory.get(key)!.push({
        userId: classification.userId,
        categoryId: classification.categoryId,
        seasonId: classification.seasonId,
        championshipId: classification.championshipId,
        totalPoints: classification.totalPoints,
        totalStages: classification.totalStages,
        wins: classification.wins,
        podiums: classification.podiums,
        polePositions: classification.polePositions,
        fastestLaps: classification.fastestLaps,
        bestPosition: classification.bestPosition,
        averagePosition: classification.averagePosition,
        user: classification.user,
        category: classification.category,
      });
    }

    return classificationBySeasonCategory;
  }

  /**
   * Recalcular classificação de uma temporada completa
   */
  async recalculateSeasonClassification(seasonId: string): Promise<void> {
    const season = await this.seasonRepository.findOne({
      where: { id: seasonId },
      relations: ['championship', 'categories'],
    });

    if (!season) {
      throw new NotFoundException('Temporada não encontrada');
    }

    // Limpar classificações existentes da temporada
    await this.classificationRepository.delete({ seasonId });

    // Invalidar cache de classificação da temporada
    await this.redisService.invalidateSeasonClassification(seasonId);

    // Buscar todas as etapas com resultados
    const stages = await this.stageRepository
      .createQueryBuilder('stage')
      .where('stage.seasonId = :seasonId', { seasonId })
      .andWhere('stage.stage_results IS NOT NULL')
      .andWhere('stage.stage_results != :emptyJson', { emptyJson: '{}' })
      .getMany();

    // Processar cada etapa usando o método atualizado
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];

      const stageResults = stage.stage_results;
      if (!stageResults) {
        continue;
      }

      // Simular dados de resultados para o método updateClassificationFromStageResults
      // Apenas para forçar o processamento - os dados reais serão lidos do stage_results
      const mockResults: StageResultData[] = [];

      // Identificar categorias que têm dados
      const categoriesWithData = Object.keys(stageResults);

      // Criar um resultado fictício para cada categoria apenas para acionar o processamento
      for (const categoryId of categoriesWithData) {
        if (
          stageResults[categoryId] &&
          typeof stageResults[categoryId] === 'object'
        ) {
          // Adicionar um resultado mock apenas para essa categoria
          mockResults.push({
            userId: 'mock',
            categoryId: categoryId,
            position: 1,
            points: 0,
            polePosition: false,
            fastestLap: false,
            dnf: false,
            dsq: false,
          });
        }
      }

      if (mockResults.length > 0) {
        // Chamar o método atualizado que processará os dados raw corretamente
        await this.updateClassificationFromStageResults(stage.id, mockResults);
      }
    }

    // Após recalcular tudo, buscar e cachear a classificação completa no Redis
    await this.cacheSeasonClassificationInRedis(seasonId);
  }

  /**
   * Cachear classificação da temporada no Redis
   */
  async cacheSeasonClassificationInRedis(seasonId: string): Promise<void> {
    try {
      // Buscar todas as classificações da temporada agrupadas por categoria
      const classifications = await this.classificationRepository.find({
        where: { seasonId },
        relations: ['user', 'category'],
        order: {
          categoryId: 'ASC',
          totalPoints: 'DESC',
          wins: 'DESC',
          podiums: 'DESC',
          bestPosition: 'ASC',
        },
      });

      // Buscar MemberProfiles para todos os usuários
      const userIds = classifications.map(c => c.userId);
      const memberProfiles = await this.memberProfileRepository.find({
        where: { id: In(userIds) },
      });

      // Criar mapa de MemberProfiles por userId
      const memberProfilesMap = new Map<string, MemberProfile>();
      memberProfiles.forEach(profile => {
        memberProfilesMap.set(profile.id, profile);
      });

      if (classifications.length === 0) {
        return;
      }

      // Agrupar classificações por categoria
      const classificationsByCategory: {
        [categoryId: string]: { pilots: any[] };
      } = {};

      for (const classification of classifications) {
        if (!classificationsByCategory[classification.categoryId]) {
          classificationsByCategory[classification.categoryId] = { pilots: [] };
        }

        // Buscar MemberProfile do usuário
        const memberProfile = memberProfilesMap.get(classification.userId);

        classificationsByCategory[classification.categoryId].pilots.push({
          totalPoints: classification.totalPoints,
          totalStages: classification.totalStages,
          wins: classification.wins,
          podiums: classification.podiums,
          polePositions: classification.polePositions,
          fastestLaps: classification.fastestLaps,
          bestPosition: classification.bestPosition,
          averagePosition: classification.averagePosition,
          lastCalculatedAt: classification.lastCalculatedAt,
          user: {
            id: classification.userId,
            name: formatName(classification.user?.name || ''),
            nickname: memberProfile?.nickName
              ? formatName(memberProfile.nickName)
              : null,
          },
        });
      }

      // Preparar dados para cache
      const cacheData = {
        lastUpdated: new Date().toISOString(),
        totalCategories: Object.keys(classificationsByCategory).length,
        totalPilots: classifications.length,
        classificationsByCategory,
      };

      // Cachear no Redis
      await this.redisService.cacheSeasonClassification(seasonId, cacheData);
    } catch (error) {
      console.error(
        '❌ [CACHE] Erro ao cachear classificação da temporada:',
        error
      );
      throw error;
    }
  }

  /**
   * Buscar classificação de um usuário específico
   */
  async getUserClassification(
    userId: string,
    seasonId: string,
    categoryId: string
  ): Promise<ClassificationData | null> {
    // Redis removido - sempre buscar do banco de dados
    const classification = await this.classificationRepository.findOne({
      where: {
        userId,
        seasonId,
        categoryId,
      },
      relations: ['user', 'category'],
    });

    if (!classification) {
      return null;
    }

    const classificationData: ClassificationData = {
      userId: classification.userId,
      categoryId: classification.categoryId,
      seasonId: classification.seasonId,
      championshipId: classification.championshipId,
      totalPoints: classification.totalPoints,
      totalStages: classification.totalStages,
      wins: classification.wins,
      podiums: classification.podiums,
      polePositions: classification.polePositions,
      fastestLaps: classification.fastestLaps,
      bestPosition: classification.bestPosition,
      averagePosition: classification.averagePosition,
      user: classification.user,
      category: classification.category,
    };

    return classificationData;
  }

  /**
   * Buscar classificação da temporada do cache Redis (alta performance)
   */
  async getSeasonClassificationFromCache(
    seasonId: string
  ): Promise<any | null> {
    try {
      const cachedData =
        await this.redisService.getSeasonClassification(seasonId);

      if (cachedData) {
        return cachedData;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Recalcular posições de uma etapa baseado em voltas e tempo total + punições
   */
  async recalculateStagePositions(
    stageId: string,
    categoryId: string,
    batteryIndex: number
  ): Promise<void> {
    try {
      // Buscar a etapa
      const stage = await this.stageRepository.findOne({
        where: { id: stageId },
      });

      if (!stage || !stage.stage_results) {
        throw new Error('Etapa não encontrada ou sem resultados');
      }

      const stageResults = stage.stage_results;

      // Verificar se a categoria existe nos resultados
      if (!stageResults[categoryId]) {
        throw new Error('Categoria não encontrada nos resultados');
      }

      // Buscar penalidades de posição aplicadas para esta etapa, categoria e bateria
      const { PenaltyService } = await import('./penalty.service');
      const { PenaltyRepositoryImpl } = await import(
        '../repositories/penalty.repository.impl'
      );
      const { Penalty } = await import('../models/penalty.entity');
      const penaltyRepository = new PenaltyRepositoryImpl(
        AppDataSource.getRepository(Penalty)
      );
      const penaltyService = new PenaltyService(penaltyRepository);
      const positionPenalties =
        await penaltyService.getPositionPenaltiesByStage(
          stageId,
          categoryId,
          batteryIndex
        );

      const categoryResults = stageResults[categoryId];
      const pilotResults: Array<{
        userId: string;
        totalLaps: number;
        totalTime: string;
        penaltyTime: number;
        totalTimeWithPenalty: number;
        finishPosition: number;
        startPosition: number;
        bestLap: string;
        qualifyingBestLap: string;
        weight: boolean;
        status?: string;
        positionPenalty: number; // Nova propriedade para penalidades de posição
      }> = [];

      // Processar cada piloto
      for (const [pilotId, pilotData] of Object.entries(categoryResults)) {
        const batteryData = (pilotData as any)[batteryIndex];
        if (!batteryData) continue;

        // Converter tempo total para milissegundos
        const totalTimeMs = batteryData.totalTime
          ? this.convertLapTimeToMs(batteryData.totalTime)
          : Infinity;
        const penaltyTimeMs = batteryData.penaltyTime
          ? parseInt(batteryData.penaltyTime) * 1000
          : 0;
        const totalTimeWithPenaltyMs = totalTimeMs + penaltyTimeMs;

        // Calcular penalidade de posição total para este piloto
        const pilotPositionPenalties = positionPenalties.filter(
          penalty => penalty.userId === pilotId
        );
        const totalPositionPenalty = pilotPositionPenalties.reduce(
          (sum, penalty) => sum + (penalty.positionPenalty || 0),
          0
        );

        pilotResults.push({
          userId: pilotId,
          totalLaps: batteryData.totalLaps || 0,
          totalTime: batteryData.totalTime || '',
          penaltyTime: batteryData.penaltyTime
            ? parseInt(batteryData.penaltyTime)
            : 0,
          totalTimeWithPenalty: totalTimeWithPenaltyMs,
          finishPosition: batteryData.finishPosition || 0,
          startPosition: batteryData.startPosition || 0,
          bestLap: batteryData.bestLap || '',
          qualifyingBestLap: batteryData.qualifyingBestLap || '',
          weight: batteryData.weight || false,
          status: batteryData.status || undefined,
          positionPenalty: totalPositionPenalty,
        });
      }

      // Filtrar pilotos que terminaram a corrida (têm tempo total e não são NC/DC/DQ)
      const finishedPilots = pilotResults.filter(pilot => {
        const hasTotalTime =
          pilot.totalTime &&
          pilot.totalTime !== '' &&
          pilot.totalTime !== '0:00.000';
        const hasValidStatus = !pilot.status || pilot.status === 'completed';
        return hasTotalTime && hasValidStatus;
      });

      // Ordenar pilotos que terminaram: primeiro por voltas (maior para menor), depois por tempo total + punição (menor para maior)
      finishedPilots.sort((a, b) => {
        // Se têm voltas diferentes, ordenar por voltas (maior para menor)
        if (a.totalLaps !== b.totalLaps) {
          return b.totalLaps - a.totalLaps;
        }

        // Se têm as mesmas voltas, ordenar por tempo total + punição (menor para maior)
        return a.totalTimeWithPenalty - b.totalTimeWithPenalty;
      });

      // Aplicar penalidades de posição após ordenação inicial
      const pilotsWithPositionPenalty = finishedPilots.filter(
        pilot => pilot.positionPenalty > 0
      );

      if (pilotsWithPositionPenalty.length > 0) {
        console.log(`📋 [RECALCULATION] Aplicando penalidades de posição:`);

        for (const pilot of pilotsWithPositionPenalty) {
          const originalPosition =
            finishedPilots.findIndex(p => p.userId === pilot.userId) + 1;
          const newPosition = Math.min(
            originalPosition + pilot.positionPenalty,
            finishedPilots.length
          );

          console.log(
            `   Piloto ${pilot.userId}: Posição ${originalPosition} → ${newPosition} (penalidade: ${pilot.positionPenalty} posições)`
          );

          // Reordenar a lista considerando a penalidade de posição
          const pilotIndex = finishedPilots.findIndex(
            p => p.userId === pilot.userId
          );
          if (pilotIndex !== -1) {
            const pilotToMove = finishedPilots.splice(pilotIndex, 1)[0];
            finishedPilots.splice(newPosition - 1, 0, pilotToMove);
          }
        }
      }

      // Atualizar posições de chegada apenas para pilotos que terminaram
      for (let i = 0; i < finishedPilots.length; i++) {
        const pilot = finishedPilots[i];
        const newPosition = i + 1;

        // Atualizar posição no resultado da etapa
        if (stageResults[categoryId][pilot.userId]) {
          stageResults[categoryId][pilot.userId][batteryIndex].finishPosition =
            newPosition;
        }
      }

      // Remover posição de pilotos que não terminaram (não têm tempo total ou têm status NC/DC/DQ)
      const unfinishedPilots = pilotResults.filter(pilot => {
        const hasTotalTime =
          pilot.totalTime &&
          pilot.totalTime !== '' &&
          pilot.totalTime !== '0:00.000';
        const hasInvalidStatus =
          pilot.status &&
          ['nc', 'dc', 'dq'].includes(pilot.status.toLowerCase());
        return !hasTotalTime || hasInvalidStatus;
      });

      for (const pilot of unfinishedPilots) {
        if (stageResults[categoryId][pilot.userId]) {
          // Remover posição (definir como null ou undefined)
          stageResults[categoryId][pilot.userId][batteryIndex].finishPosition =
            null;
        }
      }

      // Salvar resultados atualizados
      stage.stage_results = stageResults;
      await this.stageRepository.save(stage);

      console.log(
        `✅ [RECALCULATION] Posições recalculadas para etapa ${stageId}, categoria ${categoryId}, bateria ${batteryIndex}`
      );

      // Log das novas posições para pilotos que terminaram
      console.log(`🏁 [RECALCULATION] Pilotos que terminaram a corrida:`);
      finishedPilots.forEach((pilot, index) => {
        const positionPenaltyInfo =
          pilot.positionPenalty > 0
            ? `, Penalidade Posição: ${pilot.positionPenalty}`
            : '';
        console.log(
          `   Posição ${index + 1}: Piloto ${pilot.userId} - Voltas: ${pilot.totalLaps}, Tempo: ${pilot.totalTime}, Punição: ${pilot.penaltyTime}s, Total: ${pilot.totalTimeWithPenalty}ms${positionPenaltyInfo}`
        );
      });

      // Log de pilotos que não terminaram
      if (unfinishedPilots.length > 0) {
        console.log(
          `❌ [RECALCULATION] Pilotos que não terminaram a corrida (posição removida):`
        );
        unfinishedPilots.forEach(pilot => {
          const statusInfo = pilot.status
            ? ` (${pilot.status.toUpperCase()})`
            : '';
          console.log(
            `   Piloto ${pilot.userId} - Voltas: ${pilot.totalLaps}, Tempo: ${pilot.totalTime || 'N/A'}${statusInfo}`
          );
        });
      }

      // Após recalcular posições, sempre recalcular a classificação da temporada
      if (stage.seasonId) {
        this.recalculateSeasonClassification(stage.seasonId)
          .then(() => {
            console.log(
              `[ASYNC] Classificação da temporada ${stage.seasonId} recalculada após recálculo de posições.`
            );
          })
          .catch(err => {
            console.error(
              `[ASYNC] Erro ao recalcular classificação da temporada ${stage.seasonId}:`,
              err
            );
          });
      }
    } catch (error) {
      console.error('❌ [RECALCULATION] Erro ao recalcular posições:', error);
      throw error;
    }
  }

  /**
   * Buscar classificação otimizada da temporada usando dados do Redis
   */
  async getSeasonClassificationOptimized(seasonId: string) {
    try {
      // Buscar dados do Redis de forma otimizada
      const cachedClassification =
        await this.redisService.getSeasonClassification(seasonId);

      if (cachedClassification) {
        // A estrutura do Redis é: classificationsByCategory[categoryId] = [classification1, classification2, ...]
        // Precisamos transformar para: classificationsByCategory[categoryId] = { category, pilots: [...] }

        // Coletar todos os user ids para buscar dados dos usuários
        const allClassifications = Object.values(
          cachedClassification.classificationsByCategory || {}
        ).flat() as any[];

        const userIds = allClassifications
          .filter(
            (classification: any) =>
              classification.user && classification.user.id
          )
          .map((classification: any) => classification.user.id);

        if (userIds.length > 0) {
          // Buscar dados dos usuários em lote do Redis
          const usersData =
            await this.redisService.getMultipleUsersBasicInfo(userIds);

          // Transformar a estrutura e enriquecer com dados dos usuários
          const transformedClassificationsByCategory: {
            [categoryId: string]: any;
          } = {};

          Object.entries(
            cachedClassification.classificationsByCategory
          ).forEach(([categoryId, classifications]: [string, any]) => {
            if (Array.isArray(classifications) && classifications.length > 0) {
              // Pegar a categoria do primeiro item (todos têm a mesma categoria)
              const categoryData = classifications[0]?.category;

              // Enriquecer cada classificação com dados do usuário
              const enrichedPilots = classifications.map(
                (classification: any) => {
                  const userData =
                    classification.user && classification.user.id
                      ? usersData.find(u => u.id === classification.user.id)
                      : null;
                  return {
                    ...classification,
                    user: userData || classification.user,
                  };
                }
              );

              transformedClassificationsByCategory[categoryId] = {
                category: categoryData,
                pilots: enrichedPilots,
              };
            }
          });

          const result = {
            ...cachedClassification,
            classificationsByCategory: transformedClassificationsByCategory,
          };

          return result;
        } else {
          return cachedClassification;
        }
      }

      // Se não há dados no cache, retornar estrutura vazia

      return {
        lastUpdated: new Date().toISOString(),
        totalCategories: 0,
        totalPilots: 0,
        classificationsByCategory: {},
      };
    } catch (error) {
      console.error(
        '❌ [CLASSIFICATION] Erro ao buscar classificação da temporada:',
        error
      );
      throw new Error('Erro ao buscar classificação da temporada');
    }
  }
}
