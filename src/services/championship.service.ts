import { BaseService } from './base.service';
import { Championship } from '../models/championship.entity';
import { ChampionshipRepository } from '../repositories/championship.repository';
import { AsaasService } from './asaas.service';
import { GridTypeService } from './grid-type.service';
import { ScoringSystemService } from './scoring-system.service';
import { DatabaseChangeEventsService } from './database-change-events.service';

export interface ChampionshipCacheData {
  id: string;
  name: string;
  championshipImage: string;
  shortDescription: string;
  fullDescription: string;
  sponsors: any[];
}

export class ChampionshipService extends BaseService<Championship> {
  private databaseEventsService: DatabaseChangeEventsService;
  private championshipRepository: ChampionshipRepository;
  private asaasService: AsaasService;
  private gridTypeService: GridTypeService;
  private scoringSystemService: ScoringSystemService;

  constructor(championshipRepository: ChampionshipRepository) {
    super(championshipRepository);
    this.databaseEventsService = DatabaseChangeEventsService.getInstance();
    this.championshipRepository = championshipRepository;
    this.asaasService = new AsaasService();
    this.gridTypeService = new GridTypeService();
    this.scoringSystemService = new ScoringSystemService();
  }

  async create(championshipData: Partial<Championship>): Promise<Championship> {
    const championship = await super.create(championshipData);
    
    // Publish database change event
    await this.databaseEventsService.onEntityChange('INSERT', 'Championship', {
      id: championship.id,
      name: championship.name,
      slug: championship.slug,
      shortDescription: championship.shortDescription,
      fullDescription: championship.fullDescription,
      championshipImage: championship.championshipImage,
      sponsors: championship.sponsors
    });
    
    return championship;
  }

  async update(id: string, championshipData: Partial<Championship>): Promise<Championship | null> {
    const championship = await super.update(id, championshipData);
    
    if (championship) {
      // Publish database change event
      await this.databaseEventsService.onEntityChange('UPDATE', 'Championship', {
        id: championship.id,
        name: championship.name,
        slug: championship.slug,
        shortDescription: championship.shortDescription,
        fullDescription: championship.fullDescription,
        championshipImage: championship.championshipImage,
        sponsors: championship.sponsors
      });
    }
    
    return championship;
  }

  async delete(id: string): Promise<boolean> {
    const championship = await this.findById(id);
    const result = await super.delete(id);
    
    if (result && championship) {
      // Publish database change event
      await this.databaseEventsService.onEntityChange('DELETE', 'Championship', {
        id: championship.id,
        name: championship.name
      });
    }
    
    return result;
  }

  async findById(id: string): Promise<Championship | null> {
    try {
      // Buscar campeonato com relacionamentos necessários usando query builder para maior controle
      return await this.championshipRepository['repository']
        .createQueryBuilder('championship')
        .leftJoinAndSelect('championship.seasons', 'seasons')
        .leftJoinAndSelect('seasons.categories', 'categories')
        .leftJoinAndSelect('seasons.stages', 'stages')
        .where('championship.id = :id', { id })
        .getOne();
    } catch (error) {
      console.error('Error finding championship by id:', error);
      // Fallback para busca simples sem relacionamentos
      return await this.championshipRepository['repository'].findOne({
        where: { id }
      });
    }
  }

  async findBySlugOrId(slugOrId: string): Promise<Championship | null> {
    // Check if it's a UUID (ID) first
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (uuidRegex.test(slugOrId)) {
      // It's an ID
      return this.findById(slugOrId);
    } else {
      // It's a slug - query the repository directly
      return this.championshipRepository['repository'].findOne({
        where: { slug: slugOrId }
      });
    }
  }

  async findAll(): Promise<Championship[]> {
    return super.findAll();
  }

  async findByOwnerId(ownerId: string): Promise<Championship[]> {
    try {
      // Usar query builder para evitar problemas de tipo UUID
      return await this.championshipRepository['repository']
        .createQueryBuilder('championship')
        .leftJoinAndSelect('championship.seasons', 'seasons')
        .leftJoinAndSelect('seasons.categories', 'categories')
        .leftJoinAndSelect('seasons.stages', 'stages')
        .where('championship.ownerId = :ownerId', { ownerId })
        .getMany();
    } catch (error) {
      console.error('Error finding championships by owner id:', error);
      // Fallback para busca simples sem relacionamentos
      return await this.championshipRepository['repository'].find({
        where: { ownerId }
      });
    }
  }

  // Métodos que anteriormente usavam cache agora consultam diretamente o banco
  async getChampionshipBasicInfo(id: string): Promise<ChampionshipCacheData | null> {
    const championship = await this.findById(id);
    
    if (!championship) {
      return null;
    }
    
    return {
      id: championship.id,
      name: championship.name,
      championshipImage: championship.championshipImage || '',
      shortDescription: championship.shortDescription || '',
      fullDescription: championship.fullDescription || '',
      sponsors: championship.sponsors || []
    };
  }

  // Buscar múltiplos championships por IDs
  async getMultipleChampionshipsBasicInfo(ids: string[]): Promise<ChampionshipCacheData[]> {
    try {
      const championships = await this.championshipRepository['repository'].findByIds(ids);
      
      return championships.map(championship => ({
        id: championship.id,
        name: championship.name,
        championshipImage: championship.championshipImage || '',
        shortDescription: championship.shortDescription || '',
        fullDescription: championship.fullDescription || '',
        sponsors: championship.sponsors || []
      }));
    } catch (error) {
      console.error('Error getting multiple championships:', error);
      return [];
    }
  }

  // Buscar todas as temporadas de um campeonato
  async getChampionshipSeasonsBasicInfo(championshipId: string): Promise<any[]> {
    try {
      // Buscar diretamente do banco de dados
      const championship = await this.championshipRepository['repository'].findOne({
        where: { id: championshipId },
        relations: ['seasons']
      });
      
      if (!championship || !championship.seasons) {
        return [];
      }

      return championship.seasons.map(season => ({
        id: season.id,
        name: season.name,
        slug: season.slug,
        startDate: season.startDate,
        endDate: season.endDate,
        championshipId: season.championshipId,
        registrationOpen: season.registrationOpen
      }));
    } catch (error) {
      console.error('Error getting championship seasons:', error);
      return [];
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

    if (championship.asaasCustomerId) {
      throw new Error('Campeonato já possui subconta Asaas configurada');
    }

    const result = await this.setupAsaasSubAccount(championship);
    const updatedChampionship = await this.findById(championshipId);

    return {
      championship: updatedChampionship,
      ...result
    };
  }

  /**
   * Tenta novamente a configuração da subconta Asaas
   */
  async retryAsaasSubAccountSetup(championshipId: string): Promise<Championship | null> {
    const championship = await this.findById(championshipId);
    
    if (!championship) {
      throw new Error('Campeonato não encontrado');
    }

    // Remove existing Asaas data to retry
    await this.update(championshipId, {
      asaasCustomerId: undefined,
      asaasWalletId: undefined
    });

    // Retry setup
    await this.setupAsaasSubAccount(championship);
    
    return this.findById(championshipId);
  }

  /**
   * Valida se a subconta Asaas está configurada corretamente
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

    const hasCustomerId = !!championship.asaasCustomerId;
    const hasWalletId = !!championship.asaasWalletId;
    const configured = hasCustomerId && hasWalletId;

    let details: any = null;
    
    if (configured) {
      try {
        // Para validação futura - implementar método na AsaasService se necessário
        details = { validated: true, customerId: championship.asaasCustomerId };
      } catch (error) {
        console.error('Error validating Asaas sub-account:', error);
      }
    }

    return {
      configured,
      hasCustomerId,
      hasWalletId,
      details
    };
  }
} 