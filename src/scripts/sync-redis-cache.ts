#!/usr/bin/env ts-node

import { AppDataSource } from '../config/database.config';
import { RedisService } from '../services/redis.service';
import { Championship } from '../models/championship.entity';
import { Season } from '../models/season.entity';
import { Category } from '../models/category.entity';
import { Stage } from '../models/stage.entity';

class RedisCacheSyncService {
  private redisService: RedisService;

  constructor() {
    this.redisService = RedisService.getInstance();
  }

  async syncAllData(): Promise<void> {
    console.log('🚀 Iniciando sincronização completa do cache Redis...');
    
    try {
      // Conectar ao Redis
      await this.redisService.connect();
      console.log('✅ Conectado ao Redis');

      // Conectar ao PostgreSQL
      await AppDataSource.initialize();
      console.log('✅ Conectado ao PostgreSQL');

      // Sincronizar dados na ordem correta (respeitando dependências)
      await this.syncChampionships();
      await this.syncSeasons();
      await this.syncCategories();
      await this.syncStages();

      console.log('🎉 Sincronização completa finalizada com sucesso!');
    } catch (error) {
      console.error('❌ Erro durante a sincronização:', error);
      throw error;
    } finally {
      // Fechar conexões
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        console.log('🔌 Conexão PostgreSQL fechada');
      }
      
      await this.redisService.close();
      console.log('🔌 Conexão Redis fechada');
    }
  }

  private async syncChampionships(): Promise<void> {
    console.log('📋 Iniciando sincronização de Championships...');
    
    const championshipRepository = AppDataSource.getRepository(Championship);
    const championships = await championshipRepository.find({
      select: ['id', 'name', 'slug', 'championshipImage', 'shortDescription', 'fullDescription', 'sponsors']
    });

    console.log(`📊 Encontrados ${championships.length} championships para sincronizar`);

    let syncedCount = 0;
    let errorCount = 0;

    for (const championship of championships) {
      try {
        const success = await this.redisService.cacheChampionshipBasicInfo(championship.id, {
          id: championship.id,
          name: championship.name,
          slug: championship.slug || '',
          championshipImage: championship.championshipImage || '',
          shortDescription: championship.shortDescription || '',
          fullDescription: championship.fullDescription || '',
          sponsors: championship.sponsors || []
        });

        if (success) {
          syncedCount++;
        } else {
          errorCount++;
          console.warn(`⚠️  Falha ao sincronizar championship ${championship.id} - ${championship.name}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Erro ao sincronizar championship ${championship.id}:`, error);
      }
    }

    console.log(`✅ Championships sincronizados: ${syncedCount} sucesso, ${errorCount} erros`);
  }

  private async syncSeasons(): Promise<void> {
    console.log('📋 Iniciando sincronização de Seasons...');
    
    const seasonRepository = AppDataSource.getRepository(Season);
    const seasons = await seasonRepository.find({
      select: ['id', 'name', 'slug', 'startDate', 'endDate', 'championshipId', 'registrationOpen']
    });

    console.log(`📊 Encontrados ${seasons.length} seasons para sincronizar`);

    let syncedCount = 0;
    let errorCount = 0;

    for (const season of seasons) {
      try {
        const success = await this.redisService.cacheSeasonBasicInfo(season.id, {
          id: season.id,
          name: season.name,
          slug: season.slug || '',
          startDate: season.startDate,
          endDate: season.endDate,
          championshipId: season.championshipId,
          registrationOpen: season.registrationOpen
        });

        if (success) {
          syncedCount++;
        } else {
          errorCount++;
          console.warn(`⚠️  Falha ao sincronizar season ${season.id} - ${season.name}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Erro ao sincronizar season ${season.id}:`, error);
      }
    }

    console.log(`✅ Seasons sincronizados: ${syncedCount} sucesso, ${errorCount} erros`);
  }

  private async syncCategories(): Promise<void> {
    console.log('📋 Iniciando sincronização de Categories...');
    
    const categoryRepository = AppDataSource.getRepository(Category);
    const categories = await categoryRepository.find({
      select: ['id', 'name', 'ballast', 'maxPilots', 'minimumAge', 'seasonId']
    });

    console.log(`📊 Encontrados ${categories.length} categories para sincronizar`);

    let syncedCount = 0;
    let errorCount = 0;

    for (const category of categories) {
      try {
        const success = await this.redisService.cacheCategoryBasicInfo(category.id, {
          id: category.id,
          name: category.name,
          ballast: category.ballast,
          maxPilots: category.maxPilots,
          minimumAge: category.minimumAge,
          seasonId: category.seasonId
        });

        if (success) {
          syncedCount++;
        } else {
          errorCount++;
          console.warn(`⚠️  Falha ao sincronizar category ${category.id} - ${category.name}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Erro ao sincronizar category ${category.id}:`, error);
      }
    }

    console.log(`✅ Categories sincronizados: ${syncedCount} sucesso, ${errorCount} erros`);
  }

  private async syncStages(): Promise<void> {
    console.log('📋 Iniciando sincronização de Stages...');
    
    const stageRepository = AppDataSource.getRepository(Stage);
    const stages = await stageRepository.find({
      select: ['id', 'name', 'date', 'time', 'kartodrome', 'streamLink', 'briefing', 'seasonId']
    });

    console.log(`📊 Encontrados ${stages.length} stages para sincronizar`);

    let syncedCount = 0;
    let errorCount = 0;

    for (const stage of stages) {
      try {
        const success = await this.redisService.cacheStageBasicInfo(stage.id, {
          id: stage.id,
          name: stage.name,
          date: stage.date,
          time: stage.time,
          kartodrome: stage.kartodrome,
          streamLink: stage.streamLink || '',
          briefing: stage.briefing || '',
          seasonId: stage.seasonId
        });

        if (success) {
          syncedCount++;
        } else {
          errorCount++;
          console.warn(`⚠️  Falha ao sincronizar stage ${stage.id} - ${stage.name}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Erro ao sincronizar stage ${stage.id}:`, error);
      }
    }

    console.log(`✅ Stages sincronizados: ${syncedCount} sucesso, ${errorCount} erros`);
  }

  // Método para limpar completamente o cache antes da sincronização
  async clearAllCache(): Promise<void> {
    console.log('🧹 Limpando cache Redis existente...');
    
    try {
      await this.redisService.connect();
      
      // Limpar todos os sets e chaves relacionadas
      const keysToDelete = [
        'championships:all',
        'seasons:all', 
        'categories:all',
        'stages:all'
      ];

      for (const key of keysToDelete) {
        await this.redisService.deleteData(key);
      }

      console.log('✅ Cache Redis limpo com sucesso');
    } catch (error) {
      console.error('❌ Erro ao limpar cache Redis:', error);
      throw error;
    }
  }
}

// Função principal para executar o script
async function main() {
  const syncService = new RedisCacheSyncService();
  
  try {
    // Verificar se deve limpar o cache antes de sincronizar
    const shouldClear = process.argv.includes('--clear');
    
    if (shouldClear) {
      await syncService.clearAllCache();
    }
    
    await syncService.syncAllData();
    
    console.log('🎯 Script executado com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Falha na execução do script:', error);
    process.exit(1);
  }
}

// Executar apenas se o script for chamado diretamente
if (require.main === module) {
  main();
} 