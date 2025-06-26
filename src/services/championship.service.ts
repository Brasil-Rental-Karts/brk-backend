import { Championship } from '../models/championship.entity';
import { ChampionshipRepository } from '../repositories/championship.repository';
import { BaseService } from './base.service';
import { RedisService } from './redis.service';
import { GridTypeService } from './grid-type.service';
import { ScoringSystemService } from './scoring-system.service';
import { ConflictException } from '../exceptions/conflict.exception';

export interface ChampionshipCacheData {
  id: string;
  name: string;
  championshipImage: string;
  shortDescription: string;
  fullDescription: string;
  sponsors: any[];
}

export class ChampionshipService extends BaseService<Championship> {
  private redisService: RedisService;
  private championshipRepository: ChampionshipRepository;
  private gridTypeService: GridTypeService;
  private scoringSystemService: ScoringSystemService;

  constructor(championshipRepository: ChampionshipRepository) {
    super(championshipRepository);
    this.championshipRepository = championshipRepository;
    this.redisService = RedisService.getInstance();
    this.gridTypeService = new GridTypeService();
    this.scoringSystemService = new ScoringSystemService();
  }

  async create(championshipData: Partial<Championship>): Promise<Championship> {
    try {
      const championship = await super.create(championshipData);
      
      // Criar tipos de grid pré-configurados
      try {
        await this.gridTypeService.createPredefined(championship.id);
      } catch (error) {
        // console.error(`[CHAMPIONSHIP] Erro ao criar tipos de grid pré-configurados para o campeonato ${championship.id}:`, error);
      }

      // Criar sistema de pontuação pré-configurado
      try {
        await this.scoringSystemService.createPredefined(championship.id);
      } catch (error) {
        // console.error(`[CHAMPIONSHIP] Erro ao criar sistema de pontuação pré-configurado para o campeonato ${championship.id}:`, error);
      }
      
      // O cache será atualizado via database events, não aqui
      
      return championship;
    } catch (error: any) {
      if (error?.code === '23505' && error.detail?.includes('(slug)')) {
        throw new ConflictException('Já existe um campeonato com este nome. Por favor, escolha outro.');
      }
      throw error;
    }
  }

  async update(id: string, championshipData: Partial<Championship>): Promise<Championship | null> {
    const championship = await super.update(id, championshipData);
    
    // O cache será atualizado via database events, não aqui
    
    return championship;
  }

  async delete(id: string): Promise<boolean> {
    const result = await super.delete(id);
    
    // O cache será atualizado via database events, não aqui
    // Nota: Quando um campeonato é deletado, o database events service
    // também limpa automaticamente o índice de seasons relacionadas
    
    return result;
  }

  async findById(id: string): Promise<Championship | null> {
    // Apenas busca no banco, sem interferir no cache
    const championship = await this.championshipRepository['repository'].findOne({
      where: { id },
      relations: ['seasons', 'seasons.categories'],
    });
    return championship;
  }

  async findBySlugOrId(slugOrId: string): Promise<Championship | null> {
    const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(slugOrId);
    
    let where: any;
    if (isUUID) {
      where = { id: slugOrId };
    } else {
      where = { slug: slugOrId };
    }

    const championship = await this.championshipRepository['repository'].findOne({
      where,
      relations: ['seasons', 'seasons.categories'],
    });

    return championship;
  }

  async findAll(): Promise<Championship[]> {
    // Apenas busca no banco, sem interferir no cache
    const championships = await super.findAll();
    return championships;
  }

  async findByOwnerId(ownerId: string): Promise<Championship[]> {
    // Apenas busca no banco, sem interferir no cache
    const championships = await this.championshipRepository['repository'].find({
      where: { ownerId }
    });
    
    return championships;
  }

  // Método para buscar apenas dados em cache (para API cache)
  async getChampionshipBasicInfo(id: string): Promise<ChampionshipCacheData | null> {
    const cachedData = await this.getCachedChampionshipData(id);
    return cachedData;
  }

  // Buscar múltiplos championships por IDs (alta performance)
  async getMultipleChampionshipsBasicInfo(ids: string[]): Promise<ChampionshipCacheData[]> {
    try {
      // Usa o novo método otimizado com Redis pipeline
      return await this.redisService.getMultipleChampionshipsBasicInfo(ids);
    } catch (error) {
      // console.error('Error getting multiple championships from cache:', error);
      return [];
    }
  }

  // Buscar todas as temporadas de um campeonato no cache (alta performance)
  async getChampionshipSeasonsBasicInfo(championshipId: string): Promise<any[]> {
    try {
      // Busca a lista de IDs das temporadas do campeonato
      const seasonIds = await this.redisService.getChampionshipSeasonIds(championshipId);
      
      if (!seasonIds || seasonIds.length === 0) {
        return [];
      }

      // Busca os dados de todas as temporadas em paralelo usando pipeline
      return await this.redisService.getMultipleSeasonsBasicInfo(seasonIds);
    } catch (error) {
      // console.error('Error getting championship seasons from cache:', error);
      return [];
    }
  }

  // Métodos privados para cache (usados apenas pelos database events)
  private async getCachedChampionshipData(id: string): Promise<ChampionshipCacheData | null> {
    try {
      const key = `championship:${id}`;
      return await this.redisService.getData(key);
    } catch (error) {
      // console.error('Error getting cached championship data:', error);
      return null;
    }
  }

  /**
   * Atualiza o Wallet ID do Asaas para um campeonato
   */
  async updateAsaasWalletId(championshipId: string, walletId: string): Promise<Championship | null> {
    try {
      const championship = await this.findById(championshipId);
      if (!championship) {
        throw new Error('Campeonato não encontrado');
      }

      if (!championship.splitEnabled) {
        throw new Error('Split payment não está habilitado para este campeonato');
      }

      if (!walletId || walletId.trim() === '') {
        throw new Error('Wallet ID é obrigatório');
      }

      const updatedChampionship = await this.update(championshipId, {
        asaasWalletId: walletId.trim()
      });

      return updatedChampionship;
    } catch (error) {
      // console.error('[CHAMPIONSHIP] Erro ao atualizar Wallet ID:', error);
      throw error;
    }
  }

  /**
   * Verifica o status da configuração Asaas de um campeonato
   */
  async getAsaasStatus(championshipId: string): Promise<{
    championshipId: string;
    splitEnabled: boolean;
    asaasWalletId: string | null;
    configured: boolean;
    document: string;
    personType: number;
  }> {
    try {
      const championship = await this.findById(championshipId);
      if (!championship) {
        throw new Error('Campeonato não encontrado');
      }

      const isConfigured = Boolean(championship.asaasWalletId);

      return {
        championshipId: championship.id,
        splitEnabled: championship.splitEnabled,
        asaasWalletId: championship.asaasWalletId,
        configured: isConfigured,
        document: championship.document,
        personType: championship.personType
      };
    } catch (error) {
      // console.error('[CHAMPIONSHIP] Erro ao verificar status Asaas:', error);
      throw error;
    }
  }
} 