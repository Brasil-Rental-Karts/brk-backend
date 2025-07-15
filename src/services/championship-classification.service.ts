import { Repository, In } from 'typeorm';
import { AppDataSource } from '../config/database.config';
import { ChampionshipClassification } from '../models/championship-classification.entity';
import { ScoringSystem } from '../models/scoring-system.entity';
import { Stage } from '../models/stage.entity';
import { Season } from '../models/season.entity';
import { Category } from '../models/category.entity';
import { User } from '../models/user.entity';
import { Championship } from '../models/championship.entity';
import { MemberProfile } from '../models/member-profile.entity';
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
import { BadRequestException } from '../exceptions/bad-request.exception';

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
    this.classificationRepository = AppDataSource.getRepository(ChampionshipClassification);
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
  async updateClassificationFromStageResults(stageId: string, results: StageResultData[]): Promise<void> {

    const stage = await this.stageRepository.findOne({
      where: { id: stageId }
    });

    if (!stage) {
      throw new NotFoundException('Etapa não encontrada');
    }

    const season = await this.seasonRepository.findOne({
      where: { id: stage.seasonId },
      relations: ['championship']
    });

    if (!season) {
      throw new NotFoundException('Temporada não encontrada');
    }

    const championship = season.championship;

    // Buscar sistema de pontuação
    const scoringSystem = await this.scoringSystemRepository.findOne({
      where: { championshipId: championship.id }
    });

    if (!scoringSystem) {
      return;
    }
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
        allStages,
        scoringSystem
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
    allStages: Stage[],
    scoringSystem: ScoringSystem
  ): Promise<void> {

    // Coletar todos os resultados históricos da categoria
    const allResults = new Map<string, {
      totalPoints: number;
      totalStages: number;
      wins: number;
      podiums: number;
      polePositions: number;
      fastestLaps: number;
      positions: number[];
    }>();

    // Processar cada etapa
    for (const stage of allStages) {
      const stageResultsData = stage.stage_results;
      
      if (!stageResultsData || !stageResultsData[categoryId]) {
        continue;
      }

      const categoryStageResults = stageResultsData[categoryId];
      
      // Processar cada bateria individualmente para calcular pódios corretamente
      const batteryResults: { batteryIndex: string, pilotId: string, data: any }[] = [];
      
      // Coletar todos os resultados de todas as baterias
      for (const [pilotId, pilotData] of Object.entries(categoryStageResults)) {
        for (const [batteryIndex, batteryData] of Object.entries(pilotData as any)) {
          const data = batteryData as any;
          
          if (data.finishPosition !== undefined && data.finishPosition !== null) {
            batteryResults.push({
              batteryIndex,
              pilotId,
              data
            });
          }
        }
      }

      // Agrupar resultados por bateria para calcular pódios por bateria
      const batteriesByIndex = new Map<string, Array<{ pilotId: string, data: any }>>();
      
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
        const sortedPilots = batteryPilots.sort((a, b) => a.data.finishPosition - b.data.finishPosition);
        
        // Os 5 primeiros são pódio (1º, 2º, 3º, 4º, 5º)
        const podiumPilots = sortedPilots.slice(0, 5);
        const podiumPilotIds = new Set(podiumPilots.map(p => p.pilotId));
        podiumsByBattery.set(batteryIndex, podiumPilotIds);
      }

      // Processar o formato real dos dados: { pilotId: { batteryIndex: { data } } }
      const processedResults = await this.processStageResultsData(categoryId, categoryStageResults, scoringSystem);
      
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
            positions: []
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
          const pilotBatteryData = batteryResults.find(r => r.pilotId === userId && r.batteryIndex === batteryIndex);
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
          const pilotBatteryData = batteryResults.find(r => r.pilotId === userId && r.batteryIndex === batteryIndex);
          if (pilotBatteryData) {
            const startPosition = pilotBatteryData.data.startPosition;
            if (startPosition !== undefined && startPosition !== null) {
              // Verificar se esta bateria teve pole position (melhor largada da bateria)
              const batteryBestStartPosition = Math.min(...batteryResults
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
        
        if (result.fastestLapCount) userStats.fastestLaps += result.fastestLapCount;
        
        userStats.positions.push(result.position);
      }
    }

    // Atualizar registros de classificação
    for (const [userId, stats] of allResults) {
      const bestPosition = stats.positions.length > 0 ? Math.min(...stats.positions) : null;
      const averagePosition = stats.positions.length > 0 
        ? stats.positions.reduce((sum, pos) => sum + pos, 0) / stats.positions.length 
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
        averagePosition
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
    // Buscar sistema de pontuação
    const scoringSystem = await this.scoringSystemRepository.findOne({
      where: { championshipId }
    });

    if (!scoringSystem) {
      return;
    }

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
      allStages,
      scoringSystem
    );
  }

  /**
   * Processar dados raw de resultados de etapa
   */
  private async processStageResultsData(
    categoryId: string,
    categoryData: any,
    scoringSystem: ScoringSystem
  ): Promise<StageResultData[]> {
    
    // Armazenar resultados de cada bateria separadamente
    const batteryResults: { batteryIndex: string, pilotId: string, data: any }[] = [];
    
    // Coletar todos os resultados de todas as baterias
    for (const [pilotId, pilotData] of Object.entries(categoryData)) {
      
      for (const [batteryIndex, batteryData] of Object.entries(pilotData as any)) {
        const data = batteryData as any;
        
        if (data.finishPosition !== undefined && data.finishPosition !== null) {
          batteryResults.push({
            batteryIndex,
            pilotId,
            data
          });
        }
      }
    }

    // Agrupar pontos por piloto (somar pontos de todas as baterias)
    const pilotTotalPoints = new Map<string, {
      totalPoints: number;
      batteryCount: number;
      bestPosition: number;
      bestStartPosition?: number;
      bestLapTime?: string;
      bestLapMs: number;
      polePosition: boolean;
      fastestLapCount: number;
      positions: number[];
    }>();

    // Determinar pole position global (melhor largada de qualquer bateria)
    let globalBestStartPosition = Infinity;
    
    // Primeira passagem: encontrar pole position global
    for (const result of batteryResults) {
      const { data } = result;
      
      if (data.startPosition !== undefined && data.startPosition !== null) {
        globalBestStartPosition = Math.min(globalBestStartPosition, data.startPosition);
      }
    }

    // Agrupar resultados por bateria para encontrar fastest lap de cada bateria
    const batteriesByIndex = new Map<string, Array<{ pilotId: string, data: any }>>();
    
    for (const result of batteryResults) {
      const { batteryIndex, pilotId, data } = result;
      
      if (!batteriesByIndex.has(batteryIndex)) {
        batteriesByIndex.set(batteryIndex, []);
      }
      
      batteriesByIndex.get(batteryIndex)!.push({ pilotId, data });
    }

    // Encontrar fastest lap de cada bateria
    const fastestLapByBattery = new Map<string, { pilotId: string, lapTimeMs: number }>();
    
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
        fastestLapByBattery.set(batteryIndex, { pilotId: fastestLapPilot, lapTimeMs: fastestLapMs });
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
          positions: []
        });
      }

      const pilotStats = pilotTotalPoints.get(pilotId)!;
      
      // Calcular pontos da bateria
      const position = data.finishPosition;
      const positionPoints = this.getPointsForPosition(position, scoringSystem);
      
      // Verificar se esta bateria teve pole position
      const hasPoleInThisBattery = data.startPosition === globalBestStartPosition;
      
      // Verificar se este piloto teve fastest lap nesta bateria específica
      const batteryFastestLap = fastestLapByBattery.get(batteryIndex);
      const hasFastestLapInThisBattery = batteryFastestLap && batteryFastestLap.pilotId === pilotId;
      
      // Pontos adicionais
      let polePositionPoints = 0;
      let fastestLapPoints = 0;
      
      if (hasPoleInThisBattery && !pilotStats.polePosition) {
        polePositionPoints = scoringSystem.polePositionPoints || 0;
        pilotStats.polePosition = true;
      }
      
      if (hasFastestLapInThisBattery) {
        fastestLapPoints = scoringSystem.fastestLapPoints || 0;
        pilotStats.fastestLapCount += 1;
      }

      const batteryTotalPoints = positionPoints + polePositionPoints + fastestLapPoints;

      // Acumular pontos e estatísticas
      pilotStats.totalPoints += batteryTotalPoints;
      pilotStats.batteryCount += 1;
      pilotStats.bestPosition = Math.min(pilotStats.bestPosition, position);
      pilotStats.positions.push(position);
      
      // Atualizar melhor largada e melhor tempo
      if (data.startPosition !== undefined && data.startPosition !== null) {
        if (pilotStats.bestStartPosition === undefined || data.startPosition < pilotStats.bestStartPosition) {
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
        dsq: false
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
  private getPointsForPosition(position: number, scoringSystem: ScoringSystem): number {
    const positionConfig = scoringSystem.positions?.find(p => p.position === position);
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
        seasonId: data.seasonId
      }
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

      savedClassification = await this.classificationRepository.save(existingClassification);
    } else {
      // Criar nova classificação
      const classification = this.classificationRepository.create({
        ...data,
        lastCalculatedAt: new Date()
      });

      savedClassification = await this.classificationRepository.save(classification);
    }

    // Redis removido - classificação sempre buscada do banco
    return savedClassification;
  }

  /**
   * Buscar classificação por temporada e categoria
   */
  async getClassificationBySeasonAndCategory(seasonId: string, categoryId: string): Promise<ClassificationData[]> {
    // Redis removido - sempre buscar do banco de dados
    const classifications = await this.classificationRepository.find({
      where: {
        seasonId,
        categoryId
      },
      relations: ['user', 'category'],
      order: {
        totalPoints: 'DESC',
        wins: 'DESC',
        podiums: 'DESC',
        bestPosition: 'ASC'
      }
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
      category: c.category
    }));

    return classificationData;
  }

  /**
   * Buscar classificação por campeonato
   */
  async getClassificationByChampionship(championshipId: string): Promise<Map<string, ClassificationData[]>> {
    // Redis removido - sempre buscar do banco de dados
    const classifications = await this.classificationRepository.find({
      where: {
        championshipId
      },
      relations: ['user', 'category', 'season'],
      order: {
        totalPoints: 'DESC',
        wins: 'DESC',
        podiums: 'DESC',
        bestPosition: 'ASC'
      }
    });

    // Agrupar por temporada e categoria
    const classificationBySeasonCategory = new Map<string, ClassificationData[]>();
    
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
        category: classification.category
      });
    }

    return classificationBySeasonCategory;
  }

  /**
   * Recalcular classificação de uma temporada completa
   */
  async recalculateSeasonClassification(seasonId: string): Promise<void> {
    
    console.log(`🔄 [RECALC] Iniciando recálculo da classificação da temporada ${seasonId}`);
    
    const season = await this.seasonRepository.findOne({
      where: { id: seasonId },
      relations: ['championship', 'categories']
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

    console.log(`📊 [RECALC] Encontradas ${stages.length} etapas com resultados para processar`);

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
        if (stageResults[categoryId] && typeof stageResults[categoryId] === 'object') {
          // Adicionar um resultado mock apenas para essa categoria
          mockResults.push({
            userId: 'mock',
            categoryId: categoryId,
            position: 1,
            points: 0,
            polePosition: false,
            fastestLap: false,
            dnf: false,
            dsq: false
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
    
    console.log(`✅ [RECALC] Classificação da temporada ${seasonId} recalculada e persistida no Redis`);
  }

  /**
   * Cachear classificação da temporada no Redis
   */
  async cacheSeasonClassificationInRedis(seasonId: string): Promise<void> {
    try {
      console.log(`💾 [CACHE] Iniciando cache da classificação da temporada ${seasonId}`);

      // Buscar todas as classificações da temporada agrupadas por categoria
      const classifications = await this.classificationRepository.find({
        where: { seasonId },
        relations: ['user', 'category'],
        order: {
          categoryId: 'ASC',
          totalPoints: 'DESC',
          wins: 'DESC',
          podiums: 'DESC',
          bestPosition: 'ASC'
        }
      });

      // Buscar MemberProfiles para todos os usuários
      const userIds = classifications.map(c => c.userId);
      const memberProfiles = await this.memberProfileRepository.find({
        where: { id: In(userIds) }
      });

      // Criar mapa de MemberProfiles por userId
      const memberProfilesMap = new Map<string, MemberProfile>();
      memberProfiles.forEach(profile => {
        memberProfilesMap.set(profile.id, profile);
      });

      if (classifications.length === 0) {
        console.log(`⚠️ [CACHE] Nenhuma classificação encontrada para temporada ${seasonId}`);
        return;
      }

      console.log(`📊 [CACHE] Encontradas ${classifications.length} classificações para cache`);

      // Agrupar classificações por categoria
      const classificationsByCategory: { [categoryId: string]: { pilots: any[] } } = {};
      
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
            nickname: memberProfile?.nickName ? formatName(memberProfile.nickName) : null
          }
        });
      }

      // Preparar dados para cache
      const cacheData = {
        lastUpdated: new Date().toISOString(),
        totalCategories: Object.keys(classificationsByCategory).length,
        totalPilots: classifications.length,
        classificationsByCategory
      };

      // Cachear no Redis
      await this.redisService.cacheSeasonClassification(seasonId, cacheData);
      
      console.log(`✅ [CACHE] Classificação da temporada ${seasonId} cacheada no Redis com ${Object.keys(classificationsByCategory).length} categorias e ${classifications.length} pilotos`);
    } catch (error) {
      console.error('❌ [CACHE] Erro ao cachear classificação da temporada:', error);
      throw error;
    }
  }

  /**
   * Buscar classificação de um usuário específico
   */
  async getUserClassification(userId: string, seasonId: string, categoryId: string): Promise<ClassificationData | null> {
    // Redis removido - sempre buscar do banco de dados
    const classification = await this.classificationRepository.findOne({
      where: {
        userId,
        seasonId,
        categoryId
      },
      relations: ['user', 'category']
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
      category: classification.category
    };

    return classificationData;
  }

  /**
   * Buscar classificação da temporada do cache Redis (alta performance)
   */
  async getSeasonClassificationFromCache(seasonId: string): Promise<any | null> {
    try {
      const cachedData = await this.redisService.getSeasonClassification(seasonId);
      
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
   * Buscar classificação otimizada da temporada usando dados do Redis
   */
  async getSeasonClassificationOptimized(seasonId: string) {
    try {
      console.log(`🔍 [CLASSIFICATION] Buscando classificação otimizada para temporada ${seasonId}`);
      
      // Buscar dados do Redis de forma otimizada
      const cachedClassification = await this.redisService.getSeasonClassification(seasonId);
      
      if (cachedClassification) {
        console.log(`✅ [CLASSIFICATION] Dados encontrados no Redis para temporada ${seasonId}`);
        
        // A estrutura do Redis é: classificationsByCategory[categoryId] = [classification1, classification2, ...]
        // Precisamos transformar para: classificationsByCategory[categoryId] = { category, pilots: [...] }
        
        // Coletar todos os user ids para buscar dados dos usuários
        const allClassifications = Object.values(cachedClassification.classificationsByCategory || {})
          .flat() as any[];
        
        const userIds = allClassifications.map((classification: any) => classification.user.id);
        
        if (userIds.length > 0) {
          // Buscar dados dos usuários em lote do Redis
          const usersData = await this.redisService.getMultipleUsersBasicInfo(userIds);
          
          // Transformar a estrutura e enriquecer com dados dos usuários
          const transformedClassificationsByCategory: { [categoryId: string]: any } = {};
          
          Object.entries(cachedClassification.classificationsByCategory).forEach(([categoryId, classifications]: [string, any]) => {
            if (Array.isArray(classifications) && classifications.length > 0) {
              // Pegar a categoria do primeiro item (todos têm a mesma categoria)
              const categoryData = classifications[0].category;
              
              // Enriquecer cada classificação com dados do usuário
              const enrichedPilots = classifications.map((classification: any) => {
                const userData = usersData.find(u => u.id === classification.user.id);
                return {
                  ...classification,
                  user: userData || classification.user
                };
              });
              
              transformedClassificationsByCategory[categoryId] = {
                category: categoryData,
                pilots: enrichedPilots
              };
            }
          });
          
          const result = {
            ...cachedClassification,
            classificationsByCategory: transformedClassificationsByCategory
          };
          
          console.log(`📊 [CLASSIFICATION] Retornando ${Object.keys(transformedClassificationsByCategory).length} categorias com ${allClassifications.length} pilotos`);
          
          return result;
        } else {
          console.log(`⚠️ [CLASSIFICATION] Nenhum piloto encontrado para temporada ${seasonId}`);
          return cachedClassification;
        }
      }
      
      // Se não há dados no cache, retornar estrutura vazia
      console.log(`⚠️ [CLASSIFICATION] Nenhum dado encontrado no Redis para temporada ${seasonId}`);
      return {
        lastUpdated: new Date().toISOString(),
        totalCategories: 0,
        totalPilots: 0,
        classificationsByCategory: {}
      };
      
    } catch (error) {
      console.error('❌ [CLASSIFICATION] Erro ao buscar classificação da temporada:', error);
      throw new Error('Erro ao buscar classificação da temporada');
    }
  }
}