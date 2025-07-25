import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

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
    rejectUnauthorized: false,
  },
};

const LOCAL_CONFIG = {
  host: process.env.LOCAL_DB_HOST,
  port: parseInt(process.env.LOCAL_DB_PORT || '5432'),
  user: process.env.LOCAL_DB_USERNAME,
  password: process.env.LOCAL_DB_PASSWORD,
  database: process.env.LOCAL_DB_DATABASE,
  ssl: false,
};

// Ordem das tabelas para respeitar as constraints de chave estrangeira
// Atualizada com todas as novas tabelas identificadas nas migrações recentes
const TABLES_ORDER = [
  // Tabelas independentes (sem FK) - ordem alfabética
  'Championships',
  'GridTypes',
  'RaceTracks',
  'Regulations',
  'ScoringSystem',
  'Users',
  'vip_preregister',

  // Tabelas com dependências de primeiro nível
  'CreditCardFees', // FK: championshipId
  'MemberProfiles', // FK: userId
  'Seasons', // FK: championshipId

  // Tabelas com dependências de segundo nível
  'Categories', // FK: seasonId
  'ChampionshipStaff', // FK: championshipId, userId
  'Stages', // FK: seasonId

  // Tabelas com dependências de terceiro nível
  'SeasonRegistrations', // FK: seasonId, userId
  'StageParticipations', // FK: stageId, userId

  // Tabelas com dependências de quarto nível
  'SeasonRegistrationCategories', // FK: seasonRegistrationId, categoryId
  'SeasonRegistrationStages', // FK: seasonRegistrationId, stageId

  // Tabelas de pagamento e resultados (dependem de registrations e stages)
  'AsaasPayments', // FK: seasonRegistrationId
  'lap_times', // FK: stageId, userId

  // Tabelas de classificação e penalidades (dependem de múltiplas tabelas)
  'ChampionshipClassification', // FK: championshipId, userId, seasonId, categoryId
  'penalties', // FK: championshipId, userId, seasonId, stageId, categoryId, appliedByUserId, appealedByUserId
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

async function copyTableData(
  prodClient: Client,
  localClient: Client,
  tableName: string
): Promise<void> {
  console.log(`📋 Copiando dados da tabela ${tableName}...`);

  try {
    // Busca todos os dados da tabela de produção
    const result = await prodClient.query(`SELECT * FROM "${tableName}";`);

    if (result.rows.length === 0) {
      console.log(`ℹ️  Tabela ${tableName} está vazia`);
      return;
    }

    console.log(
      `📊 Encontrados ${result.rows.length} registros em ${tableName}`
    );

    // Insere os dados no banco local
    for (const row of result.rows) {
      const processedRow = { ...row };

      const columns = Object.keys(processedRow);
      const values = Object.values(processedRow).map(value => {
        // Trata campos JSON - converte objetos para string JSON válida
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          // Verifica se é um objeto que precisa ser convertido para JSON
          if (
            value.hasOwnProperty('points') ||
            value.hasOwnProperty('name') ||
            value.hasOwnProperty('order')
          ) {
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
        // Trata campos booleanos especiais
        if (typeof value === 'boolean') {
          return value;
        }
        // Trata campos de data
        if (value instanceof Date) {
          return value;
        }
        // Trata campos null
        if (value === null) {
          return null;
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
        console.error('Dados:', processedRow);
        // Continua com o próximo registro em vez de parar a migração
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
    console.log('📋 Tabelas que serão migradas:', TABLES_ORDER.join(', '));

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
    console.log('📊 Resumo das tabelas migradas:');
    for (const table of TABLES_ORDER) {
      console.log(`  - ${table}`);
    }
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
    .catch(error => {
      console.error('❌ Erro na execução do script:', error);
      process.exit(1);
    });
}

export { migrateData };
