import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from 'redis';

// Carrega as variáveis de ambiente do arquivo .env no diretório scripts
dotenv.config({ path: path.join(__dirname, '.env') });

// Configurações do Redis de PRODUÇÃO
const PROD_REDIS_CONFIG = {
  socket: {
    host: process.env.PROD_REDIS_HOST,
    port: parseInt(process.env.PROD_REDIS_PORT || '6379'),
  },
  password: process.env.PROD_REDIS_PASSWORD,
};

// Configurações do Redis LOCAL
const LOCAL_REDIS_CONFIG = {
  socket: {
    host: process.env.LOCAL_REDIS_HOST || 'localhost',
    port: parseInt(process.env.LOCAL_REDIS_PORT || '6379'),
  },
  password: process.env.LOCAL_REDIS_PASSWORD,
};

async function migrateRedisData() {
  const prodClient = createClient(PROD_REDIS_CONFIG);
  const localClient = createClient(LOCAL_REDIS_CONFIG);

  prodClient.on('error', (err) => console.error('Redis PROD Error:', err));
  localClient.on('error', (err) => console.error('Redis LOCAL Error:', err));

  try {
    console.log('🔌 Conectando aos Redis...');
    await prodClient.connect();
    await localClient.connect();
    console.log('✅ Conexões estabelecidas');

    // Faz flush no Redis local
    console.log('🧹 Limpando Redis local...');
    await localClient.flushAll();
    console.log('✅ Redis local limpo');

    // Busca todas as chaves do Redis de produção
    console.log('📋 Buscando chaves do Redis de produção...');
    const keys = await prodClient.keys('*');
    console.log(`📊 Encontradas ${keys.length} chaves no Redis de produção`);

    if (keys.length === 0) {
      console.log('ℹ️  Redis de produção está vazio');
      return;
    }

    // Copia cada chave do Redis de produção para o local
    console.log('📋 Copiando dados do Redis de produção para local...');
    let copiedCount = 0;
    let errorCount = 0;

    for (const key of keys) {
      try {
        const type = await prodClient.type(key);
        let value: any;

        switch (type) {
          case 'string':
            value = await prodClient.get(key);
            if (value !== null) {
              await localClient.set(key, value);
            }
            break;
          case 'hash':
            value = await prodClient.hGetAll(key);
            if (Object.keys(value).length > 0) {
              await localClient.hSet(key, value);
            }
            break;
          case 'list':
            value = await prodClient.lRange(key, 0, -1);
            if (value.length > 0) {
              await localClient.lPush(key, value);
            }
            break;
          case 'set':
            value = await prodClient.sMembers(key);
            if (value.length > 0) {
              await localClient.sAdd(key, value);
            }
            break;
          case 'zset':
            value = await prodClient.zRangeWithScores(key, 0, -1);
            if (value.length > 0) {
              const entries = value.map(item => ({ score: item.score, value: item.value }));
              await localClient.zAdd(key, entries);
            }
            break;
          default:
            console.log(`⚠️  Tipo não suportado para chave ${key}: ${type}`);
            continue;
        }

        copiedCount++;
        if (copiedCount % 100 === 0) {
          console.log(`📊 Progresso: ${copiedCount}/${keys.length} chaves copiadas`);
        }
      } catch (error) {
        console.error(`❌ Erro ao copiar chave ${key}:`, error);
        errorCount++;
      }
    }

    console.log(`✅ Migração concluída!`);
    console.log(`📊 Resumo: ${copiedCount} chaves copiadas, ${errorCount} erros`);

  } catch (err) {
    console.error('❌ Erro durante a migração do Redis:', err);
  } finally {
    await prodClient.disconnect();
    await localClient.disconnect();
    console.log('🔌 Conexões encerradas');
  }
}

if (require.main === module) {
  migrateRedisData();
} 