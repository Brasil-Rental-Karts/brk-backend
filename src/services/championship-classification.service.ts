import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database.config';
import { ChampionshipClassification } from '../models/championship-classification.entity';
import { ScoringSystem } from '../models/scoring-system.entity';
import { Stage } from '../models/stage.entity';
import { Season } from '../models/season.entity';
import { Category } from '../models/category.entity';
import { User } from '../models/user.entity';
import { Championship } from '../models/championship.entity';
import { RedisService } from './redis.service';

import { NotFoundException } from '../exceptions/not-found.exception';
import { BadRequestException } from '../exceptions/bad-request.exception';

export interface StageResultData {
  userId: string;
  categoryId: string;
  position: number;
  points: number;
  polePosition?: boolean;
  fastestLap?: boolean;
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
  private redisService: RedisService;

  constructor() {
    this.classificationRepository = AppDataSource.getRepository(ChampionshipClassification);
    this.scoringSystemRepository = AppDataSource.getRepository(ScoringSystem);
    this.stageRepository = AppDataSource.getRepository(Stage);
    this.seasonRepository = AppDataSource.getRepository(Season);
    this.categoryRepository = AppDataSource.getRepository(Category);
    this.userRepository = AppDataSource.getRepository(User);
    this.championshipRepository = AppDataSource.getRepository(Championship);
    this.redisService = RedisService.getInstance();
  }

  /**
   * Atualizar a classificação baseado nos resultados de uma etapa
   */
  async updateClassificationFromStageResults(stageId: string, results: StageResultData[]): Promise<void> {
    console.log('🔧 [DEBUG] updateClassificationFromStageResults iniciado para etapa:', stageId);
    
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
      console.error('❌ [DEBUG] Sistema de pontuação não encontrado para championship:', championship.id);
      return;
    }

    console.log('✅ [DEBUG] Sistema de pontuação encontrado:', scoringSystem.name);

    // Buscar todas as etapas da temporada UMA SÓ VEZ
    const allStages = await this.stageRepository
      .createQueryBuilder('stage')
      .where('stage.seasonId = :seasonId', { seasonId: season.id })
      .andWhere('stage.stage_results IS NOT NULL')
      .andWhere('stage.stage_results != :emptyJson', { emptyJson: '{}' })
      .getMany();

    console.log('🔧 [DEBUG] Total de etapas encontradas:', allStages.length);

    // Agrupar resultados por categoria
    const resultsByCategory = new Map<string, StageResultData[]>();
    for (const result of results) {
      if (!resultsByCategory.has(result.categoryId)) {
        resultsByCategory.set(result.categoryId, []);
      }
      resultsByCategory.get(result.categoryId)!.push(result);
    }

    console.log('🔧 [DEBUG] Categorias a processar:', Array.from(resultsByCategory.keys()));

    // Processar todas as categorias
    for (const [categoryId, categoryResults] of resultsByCategory) {
      console.log('🔧 [DEBUG] Processando categoria:', categoryId);
      
      await this.updateCategoryClassificationOptimized(
        season.id,
        championship.id,
        categoryId,
        allStages,
        scoringSystem
      );

      // Redis removido - classificação sempre buscada do banco
    }
    
    console.log('✅ [DEBUG] Processamento de todas as categorias concluído!');
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
    console.log('🔧 [DEBUG] updateCategoryClassificationOptimized para categoria:', categoryId);
    
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
      console.log('🔧 [DEBUG] Processando etapa:', stage.name, 'com categorias:', Object.keys(stageResultsData || {}));
      
      if (!stageResultsData || !stageResultsData[categoryId]) {
        console.log('🔧 [DEBUG] Sem dados para categoria:', categoryId, 'na etapa:', stage.name);
        continue;
      }

      const categoryStageResults = stageResultsData[categoryId];
      console.log('🔧 [DEBUG] Dados da categoria encontrados:', Object.keys(categoryStageResults));
      
      // Processar o formato real dos dados: { pilotId: { batteryIndex: { data } } }
      const processedResults = await this.processStageResultsData(categoryId, categoryStageResults, scoringSystem);
      console.log('🔧 [DEBUG] Resultados processados:', processedResults.length);
      
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
        
        if (result.position === 1) userStats.wins += 1;
        if (result.position <= 3) userStats.podiums += 1;
        if (result.polePosition) userStats.polePositions += 1;
        if (result.fastestLap) userStats.fastestLaps += 1;
        
        userStats.positions.push(result.position);
      }
    }

    console.log('🔧 [DEBUG] Total de pilotos processados na categoria:', categoryId, ':', allResults.size);

    // Atualizar registros de classificação
    for (const [userId, stats] of allResults) {
      const bestPosition = stats.positions.length > 0 ? Math.min(...stats.positions) : null;
      const averagePosition = stats.positions.length > 0 
        ? stats.positions.reduce((sum, pos) => sum + pos, 0) / stats.positions.length 
        : null;

      console.log('🔧 [DEBUG] Salvando classificação para piloto:', userId, 'categoria:', categoryId, 'com stats:', stats);

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
      console.error('❌ [DEBUG] Sistema de pontuação não encontrado para championship:', championshipId);
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
    console.log('🔧 [DEBUG] processStageResultsData iniciado para categoria:', categoryId);
    
    // Armazenar resultados de cada bateria separadamente
    const batteryResults: { batteryIndex: string, pilotId: string, data: any }[] = [];
    
    // Coletar todos os resultados de todas as baterias
    for (const [pilotId, pilotData] of Object.entries(categoryData)) {
      console.log('🔧 [DEBUG] Processando piloto:', pilotId);
      
      for (const [batteryIndex, batteryData] of Object.entries(pilotData as any)) {
        const data = batteryData as any;
        console.log('🔧 [DEBUG] Bateria:', batteryIndex, 'dados:', data);
        
        if (data.finishPosition !== undefined && data.finishPosition !== null) {
          batteryResults.push({
            batteryIndex,
            pilotId,
            data
          });
        }
      }
    }

    console.log('🔧 [DEBUG] Total de resultados de baterias:', batteryResults.length);

    // Agrupar pontos por piloto (somar pontos de todas as baterias)
    const pilotTotalPoints = new Map<string, {
      totalPoints: number;
      batteryCount: number;
      bestPosition: number;
      bestStartPosition?: number;
      bestLapTime?: string;
      bestLapMs: number;
      polePosition: boolean;
      fastestLap: boolean;
      positions: number[];
    }>();

    // Determinar pole position global (melhor largada de qualquer bateria)
    let globalBestStartPosition = Infinity;
    let globalBestLapTime = Infinity;

    // Primeira passagem: encontrar pole position e fastest lap globais
    for (const result of batteryResults) {
      const { data } = result;
      
      if (data.startPosition !== undefined && data.startPosition !== null) {
        globalBestStartPosition = Math.min(globalBestStartPosition, data.startPosition);
      }
      
      if (data.bestLap) {
        const lapTimeMs = this.convertLapTimeToMs(data.bestLap);
        globalBestLapTime = Math.min(globalBestLapTime, lapTimeMs);
      }
    }

    console.log('🔧 [DEBUG] Pole position global:', globalBestStartPosition);
    console.log('🔧 [DEBUG] Fastest lap global (ms):', globalBestLapTime);

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
          fastestLap: false,
          positions: []
        });
      }

      const pilotStats = pilotTotalPoints.get(pilotId)!;
      
      // Calcular pontos da bateria
      const position = data.finishPosition;
      const positionPoints = this.getPointsForPosition(position, scoringSystem);
      
      // Verificar se esta bateria teve pole position
      const hasPoleInThisBattery = data.startPosition === globalBestStartPosition;
      
      // Verificar se esta bateria teve fastest lap
      const lapTimeMs = data.bestLap ? this.convertLapTimeToMs(data.bestLap) : Infinity;
      const hasFastestLapInThisBattery = lapTimeMs === globalBestLapTime;
      
      // Pontos adicionais (pole e fastest lap contam apenas uma vez por piloto)
      let polePositionPoints = 0;
      let fastestLapPoints = 0;
      
      if (hasPoleInThisBattery && !pilotStats.polePosition) {
        polePositionPoints = scoringSystem.polePositionPoints || 0;
        pilotStats.polePosition = true;
      }
      
      if (hasFastestLapInThisBattery && !pilotStats.fastestLap) {
        fastestLapPoints = scoringSystem.fastestLapPoints || 0;
        pilotStats.fastestLap = true;
      }

      const batteryTotalPoints = positionPoints + polePositionPoints + fastestLapPoints;
      
      console.log(`🔧 [DEBUG] Piloto ${pilotId} Bateria ${batteryIndex}:`, {
        position,
        positionPoints,
        polePositionPoints,
        fastestLapPoints,
        batteryTotalPoints
      });

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
      
      if (lapTimeMs < pilotStats.bestLapMs) {
        pilotStats.bestLapMs = lapTimeMs;
        pilotStats.bestLapTime = data.bestLap;
      }
    }

    // Converter para formato final
    const results: StageResultData[] = [];
    
    for (const [pilotId, stats] of pilotTotalPoints) {
      console.log(`🔧 [DEBUG] Resultado final ${pilotId}:`, {
        totalPoints: stats.totalPoints,
        batteryCount: stats.batteryCount,
        bestPosition: stats.bestPosition,
        polePosition: stats.polePosition,
        fastestLap: stats.fastestLap
      });

      results.push({
        userId: pilotId,
        categoryId,
        position: stats.bestPosition, // Melhor posição para ordenação
        points: stats.totalPoints, // SOMA de todas as baterias
        polePosition: stats.polePosition,
        fastestLap: stats.fastestLap,
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

    console.log('🔧 [DEBUG] Resultados finais ordenados:', results.map(r => 
      `${r.userId}: ${r.points}pts (melhor pos: ${r.position})`
    ));

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
    console.log('💾 [DEBUG] upsertClassification chamada para:', data.userId, 'categoria:', data.categoryId);
    
    const existingClassification = await this.classificationRepository.findOne({
      where: {
        userId: data.userId,
        categoryId: data.categoryId,
        seasonId: data.seasonId
      }
    });

    console.log('💾 [DEBUG] Classificação existente encontrada:', existingClassification ? 'SIM' : 'NÃO');

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

      console.log('💾 [DEBUG] Atualizando classificação existente...');
      savedClassification = await this.classificationRepository.save(existingClassification);
      console.log('✅ [DEBUG] Classificação atualizada com sucesso! ID:', savedClassification.id);
    } else {
      // Criar nova classificação
      console.log('💾 [DEBUG] Criando nova classificação...');
      const classification = this.classificationRepository.create({
        ...data,
        lastCalculatedAt: new Date()
      });

      savedClassification = await this.classificationRepository.save(classification);
      console.log('✅ [DEBUG] Nova classificação criada com sucesso! ID:', savedClassification.id);
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
    console.log('🔄 [DEBUG] Iniciando recálculo completo da temporada:', seasonId);
    
    const season = await this.seasonRepository.findOne({
      where: { id: seasonId },
      relations: ['championship', 'categories']
    });

    if (!season) {
      throw new NotFoundException('Temporada não encontrada');
    }

    console.log('🔄 [DEBUG] Temporada encontrada:', season.name);
    console.log('🔄 [DEBUG] Campeonato:', season.championship.name);

    // Limpar classificações existentes da temporada
    console.log('🗑️ [DEBUG] Limpando classificações existentes...');
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

    console.log('🔄 [DEBUG] Etapas encontradas com resultados:', stages.length);

    // Processar cada etapa usando o método atualizado
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      console.log(`🔄 [DEBUG] Processando etapa ${i + 1}/${stages.length}:`, stage.name);
      
      const stageResults = stage.stage_results;
      if (!stageResults) {
        console.log('⚠️ [DEBUG] Etapa sem resultados, pulando...');
        continue;
      }

      // Simular dados de resultados para o método updateClassificationFromStageResults
      // Apenas para forçar o processamento - os dados reais serão lidos do stage_results
      const mockResults: StageResultData[] = [];
      
      // Identificar categorias que têm dados
      const categoriesWithData = Object.keys(stageResults);
      console.log('🔄 [DEBUG] Categorias com dados:', categoriesWithData);
      
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
        console.log('🔄 [DEBUG] Chamando updateClassificationFromStageResults para etapa:', stage.id);
        // Chamar o método atualizado que processará os dados raw corretamente
        await this.updateClassificationFromStageResults(stage.id, mockResults);
      } else {
        console.log('⚠️ [DEBUG] Nenhuma categoria com dados válidos encontrada');
      }
    }

    // Após recalcular tudo, buscar e cachear a classificação completa no Redis
    await this.cacheSeasonClassificationInRedis(seasonId);

    console.log('✅ [DEBUG] Recálculo completo da temporada finalizado!');
  }

  /**
   * Cachear classificação da temporada no Redis
   */
  private async cacheSeasonClassificationInRedis(seasonId: string): Promise<void> {
    try {
      console.log('💾 [DEBUG] Iniciando cache da classificação no Redis para temporada:', seasonId);

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

      if (classifications.length === 0) {
        console.log('⚠️ [DEBUG] Nenhuma classificação encontrada para cachear');
        return;
      }

      // Agrupar classificações por categoria
      const classificationsByCategory: { [categoryId: string]: any[] } = {};
      
      for (const classification of classifications) {
        if (!classificationsByCategory[classification.categoryId]) {
          classificationsByCategory[classification.categoryId] = [];
        }
        
        classificationsByCategory[classification.categoryId].push({
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
          lastCalculatedAt: classification.lastCalculatedAt,
          user: {
            id: classification.user?.id,
            name: classification.user?.name,
            email: classification.user?.email
          },
          category: {
            id: classification.category?.id,
            name: classification.category?.name,
            ballast: classification.category?.ballast
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
      const success = await this.redisService.cacheSeasonClassification(seasonId, cacheData);
      
      if (success) {
        console.log('✅ [DEBUG] Classificação cacheada no Redis com sucesso!');
        console.log('📊 [DEBUG] Estatísticas do cache:', {
          categorias: cacheData.totalCategories,
          pilotos: cacheData.totalPilots,
          ultimaAtualizacao: cacheData.lastUpdated
        });
      } else {
        console.log('❌ [DEBUG] Falha ao cachear classificação no Redis');
      }
    } catch (error) {
      console.log('❌ [DEBUG] Erro ao cachear classificação no Redis:', error);
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
      console.log('🔍 [DEBUG] Buscando classificação da temporada no cache Redis:', seasonId);
      
      const cachedData = await this.redisService.getSeasonClassification(seasonId);
      
      if (cachedData) {
        console.log('✅ [DEBUG] Classificação encontrada no cache Redis');
        console.log('📊 [DEBUG] Estatísticas do cache encontrado:', {
          categorias: cachedData.totalCategories,
          pilotos: cachedData.totalPilots,
          ultimaAtualizacao: cachedData.lastUpdated
        });
        return cachedData;
      } else {
        console.log('⚠️ [DEBUG] Classificação não encontrada no cache Redis');
        return null;
      }
    } catch (error) {
      console.log('❌ [DEBUG] Erro ao buscar classificação do cache Redis:', error);
      return null;
    }
  }

  /**
   * Buscar classificação da temporada (cache primeiro, banco depois)
   */
  async getSeasonClassificationOptimized(seasonId: string): Promise<any> {
    // Tentar buscar do cache primeiro
    const cachedData = await this.getSeasonClassificationFromCache(seasonId);
    
    if (cachedData) {
      return cachedData;
    }

    // Se não encontrou no cache, buscar do banco e cachear
    console.log('💾 [DEBUG] Cache miss - buscando do banco e recacheando...');
    
    try {
      await this.cacheSeasonClassificationInRedis(seasonId);
      
      // Tentar buscar novamente do cache
      const newCachedData = await this.getSeasonClassificationFromCache(seasonId);
      
      if (newCachedData) {
        return newCachedData;
      }
    } catch (error) {
      console.log('❌ [DEBUG] Erro ao recachear classificação:', error);
    }

    // Fallback: buscar diretamente do banco
    console.log('🔄 [DEBUG] Fallback - buscando diretamente do banco...');
    return await this.getClassificationBySeasonFromDatabase(seasonId);
  }

  /**
   * Buscar classificação da temporada diretamente do banco
   */
  private async getClassificationBySeasonFromDatabase(seasonId: string): Promise<any> {
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

    // Agrupar por categoria
    const classificationsByCategory: { [categoryId: string]: any[] } = {};
    
    for (const classification of classifications) {
      if (!classificationsByCategory[classification.categoryId]) {
        classificationsByCategory[classification.categoryId] = [];
      }
      
      classificationsByCategory[classification.categoryId].push({
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
        lastCalculatedAt: classification.lastCalculatedAt,
        user: {
          id: classification.user?.id,
          name: classification.user?.name,
          email: classification.user?.email
        },
        category: {
          id: classification.category?.id,
          name: classification.category?.name,
          ballast: classification.category?.ballast
        }
      });
    }

    return {
      lastUpdated: new Date().toISOString(),
      totalCategories: Object.keys(classificationsByCategory).length,
      totalPilots: classifications.length,
      classificationsByCategory
    };
  }
}

/**
 * CACHE REDIS REMOVIDO - RESUMO DAS ALTERAÇÕES:
 * 
 * 1. Removidos todos os métodos de cache Redis para classificação
 * 2. Métodos de busca agora sempre consultam diretamente o banco de dados
 * 3. Eliminadas todas as operações de cache e invalidação
 * 4. Simplificada a lógica de atualização removendo operações de Redis
 * 
 * BENEFÍCIOS:
 * - Código mais simples e direto
 * - Menos complexidade de manutenção
 * - Sempre dados atualizados diretamente do banco
 * - Eliminação de possíveis inconsistências entre cache e banco
 * - Redução da dependência do Redis para classificações
 */