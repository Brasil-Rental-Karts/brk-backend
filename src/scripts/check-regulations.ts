import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carrega as variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '../../.env') });

const LOCAL_CONFIG = {
  host: process.env.LOCAL_DB_HOST,
  port: parseInt(process.env.LOCAL_DB_PORT || '5432'),
  user: process.env.LOCAL_DB_USERNAME,
  password: process.env.LOCAL_DB_PASSWORD,
  database: process.env.LOCAL_DB_DATABASE,
  ssl: false
};

async function checkRegulations(): Promise<void> {
  let client: Client | null = null;
  
  try {
    console.log('🔍 Verificando dados da tabela Regulations...');
    
    client = new Client(LOCAL_CONFIG);
    await client.connect();
    
    // Verifica a estrutura da tabela
    const structureResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'Regulations' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Estrutura da tabela Regulations:');
    structureResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Verifica os dados
    const dataResult = await client.query(`
      SELECT id, title, "order", "seasonId", "createdAt", "updatedAt"
      FROM "Regulations" 
      ORDER BY "order" 
      LIMIT 5;
    `);
    
    console.log(`\n📊 Dados da tabela Regulations (${dataResult.rows.length} registros mostrados):`);
    dataResult.rows.forEach((row, index) => {
      console.log(`\n  ${index + 1}. ${row.title}`);
      console.log(`     ID: ${row.id}`);
      console.log(`     Ordem: ${row.order}`);
      console.log(`     Season ID: ${row.seasonId}`);
      console.log(`     Criado em: ${row.createdAt}`);
    });
    
    // Conta total de registros
    const countResult = await client.query('SELECT COUNT(*) as total FROM "Regulations";');
    console.log(`\n📈 Total de registros na tabela Regulations: ${countResult.rows[0].total}`);
    
  } catch (error) {
    console.error('❌ Erro ao verificar Regulations:', error);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// Executa a verificação
checkRegulations()
  .then(() => {
    console.log('\n✅ Verificação concluída');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro na verificação:', error);
    process.exit(1);
  }); 