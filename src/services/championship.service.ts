import { Championship } from '../models/championship.entity';
import { ChampionshipRepository } from '../repositories/championship.repository';
import { BaseService } from './base.service';
import { RedisService } from './redis.service';
import { AsaasService } from './asaas.service';

export interface ChampionshipCacheData {
  id: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
}

export class ChampionshipService extends BaseService<Championship> {
  private redisService: RedisService;
  private championshipRepository: ChampionshipRepository;
  private asaasService: AsaasService;

  constructor(championshipRepository: ChampionshipRepository) {
    super(championshipRepository);
    this.championshipRepository = championshipRepository;
    this.redisService = RedisService.getInstance();
    this.asaasService = new AsaasService();
  }

  async create(championshipData: Partial<Championship>): Promise<Championship> {
    const championship = await super.create(championshipData);
    
    console.log(`[CHAMPIONSHIP] Criado campeonato ${championship.id} - splitEnabled: ${championship.splitEnabled}, document: ${championship.document}`);
    console.log(`[CHAMPIONSHIP] Subconta Asaas será configurada manualmente através das configurações`);
    
    // Cache no Redis apenas os campos da seção "Sobre o Campeonato"
    await this.cacheChampionshipData(championship);
    
    return championship;
  }

  async update(id: string, championshipData: Partial<Championship>): Promise<Championship | null> {
    const championship = await super.update(id, championshipData);
    
    if (championship) {
      // Atualiza o cache no Redis
      await this.cacheChampionshipData(championship);
    }
    
    return championship;
  }

  async delete(id: string): Promise<boolean> {
    const result = await super.delete(id);
    
    if (result) {
      // Remove do cache Redis
      await this.invalidateChampionshipCache(id);
    }
    
    return result;
  }

  async findById(id: string): Promise<Championship | null> {
    // Primeiro tenta buscar no cache Redis
    const cachedData = await this.getCachedChampionshipData(id);
    
    if (cachedData) {
      // Se encontrou no cache, busca os dados completos no banco
      // mas retorna rapidamente se só precisar dos dados básicos
      console.log(`Championship ${id} found in cache`);
    }
    
    // Busca no banco de dados
    const championship = await super.findById(id);
    
    if (championship && !cachedData) {
      // Se não estava no cache, adiciona
      await this.cacheChampionshipData(championship);
    }
    
    return championship;
  }

  async findAll(): Promise<Championship[]> {
    const championships = await super.findAll();
    
    // Cache todos os championships encontrados
    for (const championship of championships) {
      await this.cacheChampionshipData(championship);
    }
    
    return championships;
  }

  async findByOwnerId(ownerId: string): Promise<Championship[]> {
    // Usando o repositório TypeORM diretamente para consultas específicas
    const championships = await this.championshipRepository['repository'].find({
      where: { ownerId }
    });
    
    // Cache todos os championships encontrados
    for (const championship of championships) {
      await this.cacheChampionshipData(championship);
    }
    
    return championships;
  }

  // Métodos específicos para Redis Cache
  private async cacheChampionshipData(championship: Championship): Promise<void> {
    try {
      const cacheData: ChampionshipCacheData = {
        id: championship.id,
        name: championship.name,
        shortDescription: championship.shortDescription || '',
        fullDescription: championship.fullDescription || ''
      };

      const key = `championship:${championship.id}`;
      await this.redisService.setData(key, cacheData, 3600); // Cache por 1 hora
      
      console.log(`Championship ${championship.id} cached successfully`);
    } catch (error) {
      console.error('Error caching championship data:', error);
    }
  }

  private async getCachedChampionshipData(id: string): Promise<ChampionshipCacheData | null> {
    try {
      const key = `championship:${id}`;
      return await this.redisService.getData(key);
    } catch (error) {
      console.error('Error getting cached championship data:', error);
      return null;
    }
  }

  private async invalidateChampionshipCache(id: string): Promise<void> {
    try {
      const key = `championship:${id}`;
      await this.redisService.deleteData(key);
      
      console.log(`Championship ${id} cache invalidated`);
    } catch (error) {
      console.error('Error invalidating championship cache:', error);
    }
  }

  // Método para buscar apenas dados em cache (performance otimizada)
  async getChampionshipBasicInfo(id: string): Promise<ChampionshipCacheData | null> {
    const cachedData = await this.getCachedChampionshipData(id);
    
    if (cachedData) {
      return cachedData;
    }
    
    // Se não está em cache, busca no banco e cacheia
    const championship = await this.findById(id);
    return championship ? {
      id: championship.id,
      name: championship.name,
      shortDescription: championship.shortDescription || '',
      fullDescription: championship.fullDescription || ''
    } : null;
  }

  // Método para buscar múltiplos championships básicos do cache
  async getMultipleChampionshipsBasicInfo(ids: string[]): Promise<ChampionshipCacheData[]> {
    const results: ChampionshipCacheData[] = [];
    const missingIds: string[] = [];

    // Busca em paralelo no cache
    const cachePromises = ids.map(async (id) => {
      const cached = await this.getCachedChampionshipData(id);
      if (cached) {
        results.push(cached);
      } else {
        missingIds.push(id);
      }
    });

    await Promise.all(cachePromises);

    // Para os que não estão em cache, busca no banco usando consulta específica
    if (missingIds.length > 0) {
      const championships = await this.championshipRepository['repository'].findByIds(missingIds);
      
      for (const championship of championships) {
        const basicInfo: ChampionshipCacheData = {
          id: championship.id,
          name: championship.name,
          shortDescription: championship.shortDescription || '',
          fullDescription: championship.fullDescription || ''
        };
        
        results.push(basicInfo);
        // Cache para próximas consultas
        await this.cacheChampionshipData(championship);
      }
    }

    return results;
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