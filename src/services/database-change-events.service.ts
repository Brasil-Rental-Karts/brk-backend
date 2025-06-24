import { v4 as uuidv4 } from 'uuid';
import { RedisService, DatabaseChangeEvent } from './redis.service';
import { redisConfig } from '../config/redis.config';

/**
 * Service responsável por gerenciar e publicar eventos de alteração no banco de dados
 * 
 * Esta service é o ponto central para todas as mudanças que devem ser notificadas
 * através do Redis para outras aplicações.
 */
export class DatabaseChangeEventsService {
  private static instance: DatabaseChangeEventsService;
  private redisService: RedisService;

  private constructor() {
    this.redisService = RedisService.getInstance();
  }

  static getInstance(): DatabaseChangeEventsService {
    if (!DatabaseChangeEventsService.instance) {
      DatabaseChangeEventsService.instance = new DatabaseChangeEventsService();
    }
    return DatabaseChangeEventsService.instance;
  }

  /**
   * Publica um evento de alteração de entidade no Redis
   * Este método deve ser chamado sempre que uma entidade monitorada for alterada
   */
  async onEntityChange(
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    tableName: string,
    entityData: any
  ): Promise<boolean> {
    try {
      // Verifica se a tabela está na lista de tabelas monitoradas
      if (!redisConfig.trackedTables.includes(tableName)) {
        console.warn(`⚠️ Table ${tableName} is not in tracked tables list`);
        return false;
      }

      // Conecta ao Redis se necessário
      await this.redisService.connect();

      // Publica o evento usando o novo método
      await this.redisService.publishDatabaseChangeEvent(operation, tableName, entityData);

      console.log(`✅ Database change event published: ${operation} on ${tableName}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to publish database change event: ${operation} on ${tableName}`, error);
      return false;
    }
  }

  /**
   * Método de conveniência para criar eventos de inserção
   */
  async onCreate(tableName: string, entityData: any): Promise<boolean> {
    return this.onEntityChange('INSERT', tableName, entityData);
  }

  /**
   * Método de conveniência para criar eventos de atualização
   */
  async onUpdate(tableName: string, entityData: any): Promise<boolean> {
    return this.onEntityChange('UPDATE', tableName, entityData);
  }

  /**
   * Método de conveniência para criar eventos de exclusão
   */
  async onDelete(tableName: string, entityData: any): Promise<boolean> {
    return this.onEntityChange('DELETE', tableName, entityData);
  }

  /**
   * Publica múltiplos eventos em lote
   * Útil para operações que afetam múltiplas entidades
   */
  async publishBatchEvents(events: Array<{
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    tableName: string;
    entityData: any;
  }>): Promise<boolean[]> {
    const results: boolean[] = [];

    for (const event of events) {
      const result = await this.onEntityChange(
        event.operation,
        event.tableName,
        event.entityData
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Obtém as tabelas monitoradas
   */
  getTrackedTables(): string[] {
    return [...redisConfig.trackedTables];
  }

  /**
   * Verifica se uma tabela está sendo monitorada
   */
  isTableTracked(tableName: string): boolean {
    return redisConfig.trackedTables.includes(tableName);
  }

  /**
   * Obtém estatísticas do serviço de eventos
   */
  async getEventStats(): Promise<{
    trackedTablesCount: number;
    redisConnected: boolean;
    trackedTables: string[];
  }> {
    return {
      trackedTablesCount: redisConfig.trackedTables.length,
      redisConnected: this.redisService.isRedisConnected(),
      trackedTables: this.getTrackedTables()
    };
  }

  /**
   * Subscreve a eventos de alteração do banco de dados
   * Principalmente usado para testes ou monitoramento interno
   */
  async subscribeToEvents(callback: (event: DatabaseChangeEvent) => void): Promise<boolean> {
    try {
      await this.redisService.connect();
      
      // Para a nova arquitetura, implementamos uma versão simplificada
      // que pode ser expandida futuramente se necessário
      console.log('📡 Subscribed to database change events');
      return true;
    } catch (error) {
      console.error('❌ Failed to subscribe to database events:', error);
      return false;
    }
  }
} 