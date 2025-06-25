import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config({ path: path.join(__dirname, '.env') });

const LOCAL_CONFIG = {
  host: process.env.LOCAL_DB_HOST,
  port: parseInt(process.env.LOCAL_DB_PORT || '5432'),
  user: process.env.LOCAL_DB_USERNAME,
  password: process.env.LOCAL_DB_PASSWORD,
  database: process.env.LOCAL_DB_DATABASE,
};

const REQUIRED_TABLES = [
  'Users',
  'Championships',
  'GridTypes',
  'ScoringSystem',
  'vip_preregister',
  'MemberProfiles',
  'ChampionshipStaff',
  'Seasons',
  'Categories',
  'Stages',
  'SeasonRegistrations',
  'SeasonRegistrationCategories',
  'StageParticipations',
  'AsaasPayments',
];

async function checkTables(): Promise<void> {
  let client: Client | null = null;
  
  try {
    console.log('🔍 Verificando se todas as tabelas existem no banco local...');
    
    client = new Client(LOCAL_CONFIG);
    await client.connect();
    
    const missingTables: string[] = [];
    const existingTables: string[] = [];
    
    for (const table of REQUIRED_TABLES) {
      try {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          );
        `, [table]);
        
        if (result.rows[0].exists) {
          existingTables.push(table);
          console.log(`✅ Tabela ${table} existe`);
        } else {
          missingTables.push(table);
          console.log(`❌ Tabela ${table} não existe`);
        }
      } catch (error) {
        missingTables.push(table);
        console.log(`❌ Erro ao verificar tabela ${table}:`, error);
      }
    }
    
    console.log('\n📊 Resumo:');
    console.log(`✅ Tabelas existentes: ${existingTables.length}`);
    console.log(`❌ Tabelas faltando: ${missingTables.length}`);
    
    if (missingTables.length > 0) {
      console.log('\n❌ Tabelas que precisam ser criadas:');
      missingTables.forEach(table => console.log(`  - ${table}`));
      console.log('\n💡 Execute as migrações primeiro:');
      console.log('   npm run migration:run');
      process.exit(1);
    } else {
      console.log('\n🎉 Todas as tabelas existem! Você pode executar a migração.');
      console.log('   npm run migrate-prod-to-local');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar tabelas:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// Executa a verificação se o script for chamado diretamente
if (require.main === module) {
  checkTables();
}

export { checkTables }; 