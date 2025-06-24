#!/usr/bin/env ts-node

/**
 * REDIS CACHE SYNC SCRIPT - DEPRECATED
 * 
 * Este script foi desabilitado devido à migração da arquitetura Redis.
 * 
 * NOVA ARQUITETURA:
 * - Redis é usado EXCLUSIVAMENTE para eventos de alteração do banco de dados
 * - PostgreSQL é a fonte única da verdade para todos os dados
 * - Não há mais cache de dados no Redis
 * 
 * Se você precisa sincronizar dados, todos os dados agora vêm diretamente do PostgreSQL.
 * Os eventos de alteração são publicados automaticamente pelos services quando há mudanças.
 */

class DeprecatedRedisCacheSyncService {
  async run(): Promise<void> {
    console.log('🚨 SCRIPT DESABILITADO - Nova Arquitetura Redis');
    console.log('');
    console.log('📋 INFORMAÇÕES:');
    console.log('   • Redis agora é usado APENAS para eventos de alteração');
    console.log('   • PostgreSQL é a fonte única da verdade');
    console.log('   • Não há mais cache de dados no Redis');
    console.log('');
    console.log('🔄 MIGRAÇÃO CONCLUÍDA:');
    console.log('   • Todos os dados vêm diretamente do PostgreSQL');
    console.log('   • Eventos são publicados automaticamente pelos services');
    console.log('   • Cache foi removido para garantir consistência');
    console.log('');
    console.log('📚 Consulte: REDIS_ARCHITECTURE_MIGRATION.md');
    console.log('');
    console.log('✅ Nenhuma ação necessária - arquitetura funcionando corretamente');
  }
}

async function main() {
  try {
    const service = new DeprecatedRedisCacheSyncService();
    await service.run();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

// Execute se chamado diretamente
if (require.main === module) {
  main();
} 