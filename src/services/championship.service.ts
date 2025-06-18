import { Championship } from '../models/championship.entity';
import { ChampionshipRepository } from '../repositories/championship.repository';
import { BaseService } from './base.service';
import { RedisService } from './redis.service';
import { AsaasService } from './asaas.service';
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
  private asaasService: AsaasService;
  private gridTypeService: GridTypeService;
  private scoringSystemService: ScoringSystemService;

  constructor(championshipRepository: ChampionshipRepository) {
    super(championshipRepository);
    this.championshipRepository = championshipRepository;
    this.redisService = RedisService.getInstance();
    this.asaasService = new AsaasService();
    this.gridTypeService = new GridTypeService();
    this.scoringSystemService = new ScoringSystemService();
  }

  async create(championshipData: Partial<Championship>): Promise<Championship> {
    try {
      const championship = await super.create(championshipData);
      
      console.log(`[CHAMPIONSHIP] Criado campeonato ${championship.id} - splitEnabled: ${championship.splitEnabled}, document: ${championship.document}`);
      console.log(`[CHAMPIONSHIP] Subconta Asaas será configurada manualmente através das configurações`);
      
      // Criar tipos de grid pré-configurados
      try {
        await this.gridTypeService.createPredefined(championship.id);
        console.log(`[CHAMPIONSHIP] Tipos de grid pré-configurados criados para o campeonato ${championship.id}`);
      } catch (error) {
        console.error(`[CHAMPIONSHIP] Erro ao criar tipos de grid pré-configurados para o campeonato ${championship.id}:`, error);
      }

      // Criar sistema de pontuação pré-configurado
      try {
        await this.scoringSystemService.createPredefined(championship.id);
        console.log(`[CHAMPIONSHIP] Sistema de pontuação pré-configurado criado para o campeonato ${championship.id}`);
      } catch (error) {
        console.error(`[CHAMPIONSHIP] Erro ao criar sistema de pontuação pré-configurado para o campeonato ${championship.id}:`, error);
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
      console.error('Error getting multiple championships from cache:', error);
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
      console.error('Error getting championship seasons from cache:', error);
      return [];
    }
  }

  // Métodos privados para cache (usados apenas pelos database events)
  private async getCachedChampionshipData(id: string): Promise<ChampionshipCacheData | null> {
    try {
      const key = `championship:${id}`;
      return await this.redisService.getData(key);
    } catch (error) {
      console.error('Error getting cached championship data:', error);
      return null;
    }
  }

  /**
   * Mapeia dados da subconta Asaas para campos do Championship
   */
  private mapAsaasDataToChampionship(asaasData: any): Partial<Championship> {
    const updates: Partial<Championship> = {};
    
    // Atualizar documento (CPF/CNPJ)
    if (asaasData.cpfCnpj) {
      updates.document = asaasData.cpfCnpj;
    }
    
    // Atualizar campos baseados nos dados do Asaas
    if (asaasData.name) {
      if (asaasData.companyType) {
        // Pessoa Jurídica - atualizar razão social
        updates.socialReason = asaasData.name;
      } else {
        // Pessoa Física - atualizar nome do responsável
        updates.responsibleName = asaasData.name;
      }
    }
    
    if (asaasData.email) {
      updates.responsibleEmail = asaasData.email;
    }
    
    if (asaasData.phone || asaasData.mobilePhone) {
      updates.responsiblePhone = asaasData.mobilePhone || asaasData.phone;
    }
    
    if (asaasData.birthDate) {
      updates.responsibleBirthDate = new Date(asaasData.birthDate);
    }
    
    if (asaasData.companyType) {
      updates.companyType = asaasData.companyType;
    }
    
    if (asaasData.address) {
      updates.fullAddress = asaasData.address;
    }
    
    if (asaasData.addressNumber) {
      updates.number = asaasData.addressNumber;
    }
    
    if (asaasData.complement) {
      updates.complement = asaasData.complement;
    }
    
    if (asaasData.province) {
      updates.province = asaasData.province;
    }
    
    if (asaasData.postalCode) {
      updates.cep = asaasData.postalCode;
    }
    
    if (asaasData.city) {
      updates.city = asaasData.city;
    }
    
    if (asaasData.state) {
      updates.state = asaasData.state;
    }
    
    if (asaasData.incomeValue && typeof asaasData.incomeValue === 'number') {
      updates.incomeValue = asaasData.incomeValue;
    }
    
    console.log(`[CHAMPIONSHIP] Dados mapeados do Asaas:`, updates);
    
    return updates;
  }

  /**
   * Configura a subconta não white label no Asaas para split payment
   */
  private async setupAsaasSubAccount(championship: Championship): Promise<{
    wasExisting: boolean;
    foundBy?: 'cpfCnpj' | 'email';
    updatedFields?: string[];
  }> {
    try {
      console.log(`[CHAMPIONSHIP] Configurando subconta não white label no Asaas para campeonato: ${championship.id}`);
      console.log(`[CHAMPIONSHIP] Dados do campeonato:`, {
        id: championship.id,
        name: championship.name,
        document: championship.document,
        personType: championship.personType,
        splitEnabled: championship.splitEnabled
      });
      
      // Prepara os dados da subconta não white label
      const subAccountData = this.asaasService.prepareSubAccountData(championship);
      
      // Busca ou cria a subconta não white label e obtém o walletId
      const { subAccountId, walletId, wasExisting, foundBy, existingAccountData } = await this.asaasService.getOrCreateSubAccountWallet(subAccountData);
      
      let updatedFields: string[] = [];
      let championshipUpdates: Partial<Championship> = {
        asaasCustomerId: subAccountId,
        asaasWalletId: walletId
      };
      
      if (wasExisting && existingAccountData) {
        console.log(`[CHAMPIONSHIP] Subconta existente encontrada por ${foundBy} - CustomerID: ${subAccountId}, WalletID: ${walletId}`);
        console.log(`[CHAMPIONSHIP] Atualizando dados do campeonato com informações da conta existente do Asaas`);
        
        // Mapear dados do Asaas para campos do Championship
        const asaasDataUpdates = this.mapAsaasDataToChampionship(existingAccountData);
        championshipUpdates = { ...championshipUpdates, ...asaasDataUpdates };
        updatedFields = Object.keys(asaasDataUpdates);
        
        console.log(`[CHAMPIONSHIP] Campos que serão atualizados:`, updatedFields);
      } else {
        console.log(`[CHAMPIONSHIP] Nova subconta criada - CustomerID: ${subAccountId}, WalletID: ${walletId}`);
      }
      
      // Atualiza o campeonato com os dados da subconta e dados do Asaas (se existente)
      const updatedChampionship = await this.update(championship.id, championshipUpdates);
      
      if (updatedChampionship) {
        console.log(`[CHAMPIONSHIP] Campeonato atualizado com dados da subconta não white label:`);
        console.log(`[CHAMPIONSHIP] - CustomerID: ${updatedChampionship.asaasCustomerId}`);
        console.log(`[CHAMPIONSHIP] - WalletID: ${updatedChampionship.asaasWalletId}`);
        console.log(`[CHAMPIONSHIP] - Split Payment: ${updatedChampionship.splitEnabled ? 'HABILITADO' : 'DESABILITADO'}`);
        console.log(`[CHAMPIONSHIP] - Conta ${wasExisting ? 'vinculada' : 'criada'} com sucesso`);
        
        if (wasExisting && updatedFields.length > 0) {
          console.log(`[CHAMPIONSHIP] - Dados atualizados da conta existente: ${updatedFields.join(', ')}`);
        }
      } else {
        throw new Error('Falha ao atualizar campeonato com dados da subconta');
      }
      
      console.log(`[CHAMPIONSHIP] Subconta não white label ${wasExisting ? 'vinculada' : 'configurada'} com sucesso para campeonato: ${championship.id}`);
      
      return { wasExisting, foundBy, updatedFields };
    } catch (error) {
      console.error('[CHAMPIONSHIP] Erro ao configurar subconta não white label no Asaas:', error);
      throw error;
    }
  }

  /**
   * Cria a subconta Asaas manualmente (chamado através das configurações)
   */
  async createAsaasSubAccount(championshipId: string): Promise<{
    championship: Championship | null;
    wasExisting: boolean;
    foundBy?: 'cpfCnpj' | 'email';
    updatedFields?: string[];
  }> {
    const championship = await this.findById(championshipId);
    
    if (!championship) {
      throw new Error('Campeonato não encontrado');
    }
    
    if (!championship.splitEnabled) {
      throw new Error('Split payment não está habilitado para este campeonato');
    }
    
    if (!championship.document) {
      throw new Error('Documento (CPF/CNPJ) é obrigatório para criar a subconta Asaas');
    }
    
    if (championship.asaasWalletId && championship.asaasCustomerId) {
      console.log(`[CHAMPIONSHIP] Subconta Asaas já existe - CustomerID: ${championship.asaasCustomerId}, WalletID: ${championship.asaasWalletId}`);
      return { 
        championship, 
        wasExisting: true 
      };
    }
    
    console.log(`[CHAMPIONSHIP] Verificando/criando subconta Asaas para campeonato: ${championshipId}`);
    const { wasExisting, foundBy, updatedFields } = await this.setupAsaasSubAccount(championship);
    
    // Busca o campeonato atualizado para confirmar que os dados foram salvos
    const updatedChampionship = await this.findById(championshipId);
    
    if (updatedChampionship && updatedChampionship.asaasCustomerId && updatedChampionship.asaasWalletId) {
      console.log(`[CHAMPIONSHIP] Subconta Asaas ${wasExisting ? 'vinculada' : 'criada'} com sucesso:`);
      console.log(`[CHAMPIONSHIP] - CustomerID: ${updatedChampionship.asaasCustomerId}`);
      console.log(`[CHAMPIONSHIP] - WalletID: ${updatedChampionship.asaasWalletId}`);
      
      if (wasExisting && updatedFields && updatedFields.length > 0) {
        console.log(`[CHAMPIONSHIP] - Dados atualizados: ${updatedFields.join(', ')}`);
      }
    } else {
      console.error(`[CHAMPIONSHIP] Falha na ${wasExisting ? 'vinculação' : 'criação'} - dados não foram salvos corretamente`);
    }
    
    return { 
      championship: updatedChampionship, 
      wasExisting, 
      foundBy,
      updatedFields
    };
  }

  /**
   * Reconfigura a subconta não white label no Asaas (útil para retry em caso de falha)
   */
  async retryAsaasSubAccountSetup(championshipId: string): Promise<Championship | null> {
    const championship = await this.findById(championshipId);
    
    if (!championship) {
      throw new Error('Campeonato não encontrado');
    }
    
    if (!championship.splitEnabled) {
      throw new Error('Split payment não está habilitado para este campeonato');
    }
    
    if (championship.asaasWalletId && championship.asaasCustomerId) {
      console.log(`[CHAMPIONSHIP] Subconta não white label já configurada - CustomerID: ${championship.asaasCustomerId}, WalletID: ${championship.asaasWalletId}`);
      return championship;
    }
    
    console.log(`[CHAMPIONSHIP] Forçando reconfiguração da subconta não white label para campeonato: ${championshipId}`);
    await this.setupAsaasSubAccount(championship);
    
    // Busca o campeonato atualizado para confirmar que os dados foram salvos
    const updatedChampionship = await this.findById(championshipId);
    
    if (updatedChampionship && updatedChampionship.asaasCustomerId && updatedChampionship.asaasWalletId) {
      console.log(`[CHAMPIONSHIP] Reconfiguração concluída com sucesso:`);
      console.log(`[CHAMPIONSHIP] - CustomerID: ${updatedChampionship.asaasCustomerId}`);
      console.log(`[CHAMPIONSHIP] - WalletID: ${updatedChampionship.asaasWalletId}`);
    } else {
      console.error(`[CHAMPIONSHIP] Falha na reconfiguração - dados não foram salvos corretamente`);
    }
    
    return updatedChampionship;
  }

  /**
   * Valida se a subconta não white label está configurada corretamente
   */
  async validateAsaasSubAccountSetup(championshipId: string): Promise<{ 
    configured: boolean; 
    hasCustomerId: boolean; 
    hasWalletId: boolean; 
    details: any 
  }> {
    const championship = await this.findById(championshipId);
    
    if (!championship) {
      throw new Error('Campeonato não encontrado');
    }
    
    const hasCustomerId = !!(championship.asaasCustomerId);
    const hasWalletId = !!(championship.asaasWalletId);
    const configured = hasCustomerId && hasWalletId;
    
    const details = {
      championshipId: championship.id,
      name: championship.name,
      splitEnabled: championship.splitEnabled,
      asaasCustomerId: championship.asaasCustomerId,
      asaasWalletId: championship.asaasWalletId,
      document: championship.document,
      personType: championship.personType
    };
    
    console.log(`[CHAMPIONSHIP] Validação da subconta não white label:`, {
      configured,
      hasCustomerId,
      hasWalletId,
      details
    });
    
    return {
      configured,
      hasCustomerId,
      hasWalletId,
      details
    };
  }
} 