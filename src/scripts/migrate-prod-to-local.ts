import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carrega as variáveis de ambiente do arquivo .env no diretório scripts
dotenv.config({ path: path.join(__dirname, '.env') });

// Configurações dos bancos
const PROD_CONFIG = {
  host: process.env.PROD_DB_HOST,
  port: parseInt(process.env.PROD_DB_PORT || '5432'),
  user: process.env.PROD_DB_USERNAME,
  password: process.env.PROD_DB_PASSWORD,
  database: process.env.PROD_DB_DATABASE,
  ssl: {
    rejectUnauthorized: false
  }
};

const LOCAL_CONFIG = {
  host: process.env.LOCAL_DB_HOST,
  port: parseInt(process.env.LOCAL_DB_PORT || '5432'),
  user: process.env.LOCAL_DB_USERNAME,
  password: process.env.LOCAL_DB_PASSWORD,
  database: process.env.LOCAL_DB_DATABASE,
  ssl: false
};

// Ordem das tabelas para respeitar as constraints de chave estrangeira
const TABLES_ORDER = [
  // Tabelas independentes (sem FK)
  'Users',
  'Championships',
  'GridTypes',
  'ScoringSystem',
  'vip_preregister',
  
  // Tabelas com dependências
  'MemberProfiles', // FK: userId
  'ChampionshipStaff', // FK: championshipId, userId
  'Seasons', // FK: championshipId
  'Categories', // FK: seasonId
  'Stages', // FK: seasonId
  'SeasonRegistrations', // FK: seasonId, userId
  'SeasonRegistrationCategories', // FK: seasonRegistrationId, categoryId
  'StageParticipations', // FK: stageId, userId
  'AsaasPayments', // FK: seasonRegistrationId
];

async function createConnection(config: any): Promise<Client> {
  const client = new Client(config);
  await client.connect();
  return client;
}

async function truncateAllTables(client: Client): Promise<void> {
  console.log('🗑️  Iniciando truncate de todas as tabelas...');
  
  // Trunca todas as tabelas na ordem reversa para evitar problemas de FK
  for (let i = TABLES_ORDER.length - 1; i >= 0; i--) {
    const table = TABLES_ORDER[i];
    try {
      await client.query(`TRUNCATE TABLE "${table}" CASCADE;`);
      console.log(`✅ Tabela ${table} truncada`);
    } catch (error) {
      console.log(`⚠️  Erro ao truncar ${table}:`, error);
    }
  }
  
  console.log('✅ Truncate concluído');
}

async function copyTableData(prodClient: Client, localClient: Client, tableName: string): Promise<void> {
  console.log(`📋 Copiando dados da tabela ${tableName}...`);
  
  try {
    // Busca todos os dados da tabela de produção
    const result = await prodClient.query(`SELECT * FROM "${tableName}";`);
    
    if (result.rows.length === 0) {
      console.log(`ℹ️  Tabela ${tableName} está vazia`);
      return;
    }
    
    console.log(`📊 Encontrados ${result.rows.length} registros em ${tableName}`);
    
    // Insere os dados no banco local
    for (const row of result.rows) {
      const columns = Object.keys(row);
      const values = Object.values(row).map(value => {
        // Trata campos JSON - converte objetos para string JSON válida
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          // Verifica se é um objeto que precisa ser convertido para JSON
          if (value.hasOwnProperty('points') || value.hasOwnProperty('name') || value.hasOwnProperty('order')) {
            return JSON.stringify(value);
          }
        }
        // Para arrays JavaScript que representam JSON, converte para JSON
        if (Array.isArray(value) && value.length > 0) {
          // Verifica se é um array de objetos (JSON) ou array simples (PostgreSQL array)
          const firstItem = value[0];
          if (typeof firstItem === 'object' && firstItem !== null) {
            return JSON.stringify(value);
          }
          // Para arrays simples (números, strings), mantém como array PostgreSQL
          return value;
        }
        return value;
      });
      
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
      
      const query = `
        INSERT INTO "${tableName}" (${columns.map(col => `"${col}"`).join(', ')})
        VALUES (${placeholders})
        ON CONFLICT (id) DO NOTHING;
      `;
      
      try {
        await localClient.query(query, values);
      } catch (error) {
        console.error(`❌ Erro ao inserir registro em ${tableName}:`, error);
        console.error('Dados:', row);
      }
    }
    
    console.log(`✅ Tabela ${tableName} copiada com sucesso`);
  } catch (error) {
    console.error(`❌ Erro ao copiar tabela ${tableName}:`, error);
  }
}

async function migrateData(): Promise<void> {
  let prodClient: Client | null = null;
  let localClient: Client | null = null;
  
  try {
    console.log('🚀 Iniciando migração de dados de produção para local...');
    
    // Conecta aos bancos
    console.log('🔌 Conectando aos bancos de dados...');
    prodClient = await createConnection(PROD_CONFIG);
    localClient = await createConnection(LOCAL_CONFIG);
    
    console.log('✅ Conexões estabelecidas');
    
    // Desabilita as foreign key constraints temporariamente
    console.log('🔓 Desabilitando foreign key constraints...');
    await localClient.query('SET session_replication_role = replica;');
    
    // Trunca todas as tabelas locais
    await truncateAllTables(localClient);
    
    // Copia os dados na ordem correta
    for (const table of TABLES_ORDER) {
      await copyTableData(prodClient, localClient, table);
    }
    
    // Reabilita as foreign key constraints
    console.log('🔒 Reabilitando foreign key constraints...');
    await localClient.query('SET session_replication_role = DEFAULT;');
    
    console.log('🎉 Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  } finally {
    // Fecha as conexões
    if (prodClient) {
      await prodClient.end();
    }
    if (localClient) {
      await localClient.end();
    }
    console.log('🔌 Conexões fechadas');
  }
}

// Executa a migração se o script for chamado diretamente
if (require.main === module) {
  migrateData()
    .then(() => {
      console.log('✅ Script executado com sucesso');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro na execução do script:', error);
      process.exit(1);
    });
}

export { migrateData }; 