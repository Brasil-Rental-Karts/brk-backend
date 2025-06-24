import { DataSource } from 'typeorm';
import { join } from 'path';
import { config } from 'dotenv';

// Carrega variáveis do .env da pasta scripts
config({ path: join(__dirname, '.env') });

// Validação das variáveis obrigatórias
const requiredEnvVars = [
  'PROD_DB_HOST', 'PROD_DB_PORT', 'PROD_DB_USERNAME', 'PROD_DB_PASSWORD', 'PROD_DB_DATABASE',
  'LOCAL_DB_HOST', 'LOCAL_DB_PORT', 'LOCAL_DB_USERNAME', 'LOCAL_DB_PASSWORD', 'LOCAL_DB_DATABASE'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Variável de ambiente ${envVar} não encontrada!`);
    console.error('💡 Certifique-se de que o arquivo .env existe na pasta scripts/');
    console.error('📋 Use o arquivo .env.example como template');
    process.exit(1);
  }
}

// Configuração do banco de PRODUÇÃO (SSL true)
const prodDataSource = new DataSource({
  type: 'postgres',
  host: process.env.PROD_DB_HOST!,
  port: parseInt(process.env.PROD_DB_PORT!),
  username: process.env.PROD_DB_USERNAME!,
  password: process.env.PROD_DB_PASSWORD!,
  database: process.env.PROD_DB_DATABASE!,
  entities: [join(__dirname, '../models/**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, '../migrations/**/*{.ts,.js}')],
  ssl: { rejectUnauthorized: false },
  synchronize: false,
  logging: false,
});

// Configuração do banco LOCAL (SSL false)
const localDataSource = new DataSource({
  type: 'postgres',
  host: process.env.LOCAL_DB_HOST!,
  port: parseInt(process.env.LOCAL_DB_PORT!),
  username: process.env.LOCAL_DB_USERNAME!,
  password: process.env.LOCAL_DB_PASSWORD!,
  database: process.env.LOCAL_DB_DATABASE!,
  entities: [join(__dirname, '../models/**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, '../migrations/**/*{.ts,.js}')],
  ssl: false,
  synchronize: false,
  logging: false,
});

// Função para descobrir tabelas automaticamente
async function getAvailableTables(dataSource: DataSource): Promise<string[]> {
  const result = await dataSource.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  
  return result.map((row: any) => row.table_name);
}

async function copyTable(tableName: string, shouldTruncate: boolean = true) {
  console.log(`Copiando tabela: ${tableName}`);
  
  try {
    // Preserva o case do nome da tabela usando aspas duplas
    const quotedTableName = `"${tableName}"`;
    
    // Campos que devem ser ignorados (gerados automaticamente)
    const ignoredFields = ['createdAt', 'updatedAt', 'created_at', 'updated_at'];
    
    // Primeiro, descobre as colunas da tabela em produção
    const columnsResult = await prodDataSource.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [tableName]);
    
    // Filtra as colunas, removendo as que devem ser ignoradas
    const allColumns = columnsResult.map((col: any) => col.column_name);
    const validColumns = allColumns.filter((col: string) => 
      !ignoredFields.some(ignored => 
        col.toLowerCase() === ignored.toLowerCase()
      )
    );
    
    if (validColumns.length === 0) {
      console.log(`  ⚠️  Tabela ${tableName} não tem colunas válidas para copiar`);
      return;
    }
    
    // Busca dados da produção apenas das colunas válidas
    const columnsStr = validColumns.map(col => `"${col}"`).join(', ');
    const prodData = await prodDataSource.query(`SELECT ${columnsStr} FROM ${quotedTableName}`);
    
    if (prodData.length === 0) {
      console.log(`  ✓ Tabela ${tableName} está vazia`);
      return;
    }

    console.log(`  📋 Copiando ${validColumns.length} colunas (ignorando: ${ignoredFields.filter(f => allColumns.some(c => c.toLowerCase() === f.toLowerCase())).join(', ') || 'nenhuma'})`);
    console.log(`  📝 Colunas a copiar: ${validColumns.join(', ')}`);

    // Primeiro, tenta descobrir o nome correto da tabela no banco local
    const localTableName = await findLocalTableName(tableName);
    const quotedLocalTableName = localTableName ? `"${localTableName}"` : quotedTableName;

    // Só limpa a tabela se solicitado (evita CASCADE)
    if (shouldTruncate) {
      console.log(`  🗑️  Limpando tabela local ${quotedLocalTableName}...`);
      await localDataSource.query(`TRUNCATE TABLE ${quotedLocalTableName} RESTART IDENTITY CASCADE`);
      console.log(`  ✓ Tabela limpa. Iniciando inserção de ${prodData.length} registros...`);
    } else {
      console.log(`  📊 Iniciando inserção de ${prodData.length} registros (tabela já foi limpa)...`);
    }
    
    // Descobre quais colunas são JSON na tabela local
    const jsonColumns = await getJsonColumns(localTableName || tableName);
    if (jsonColumns.length > 0) {
      console.log(`  🔄 Campos JSON detectados: ${jsonColumns.join(', ')}`);
    }
    
    // Insere os dados no banco local
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < prodData.length; i++) {
      const row = prodData[i];
      const columns = Object.keys(row);
      let values = Object.values(row);
      
      // Converte campos JSON para string se necessário
      values = values.map((value, index) => {
        const columnName = columns[index];
        if (jsonColumns.includes(columnName.toLowerCase()) && value !== null && typeof value === 'object') {
          return JSON.stringify(value);
        }
        return value;
      });
      
      // Cria os placeholders para os valores ($1, $2, etc.)
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
      const quotedColumns = columns.map(col => `"${col}"`).join(', ');
      
      // Usa ON CONFLICT DO NOTHING para ignorar duplicatas (mais seguro)
      const query = `INSERT INTO ${quotedLocalTableName} (${quotedColumns}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
      
      try {
        const result = await localDataSource.query(query, values);
        successCount++;
        
        // Se o resultado for vazio, significa que foi ignorado por conflito
        if (result && result[1] === 0) {
          console.log(`  ⚠️  Registro ${i + 1} já existia, ignorado`);
        }
        
        // Mostra progresso a cada 5 registros ou se for Categories
        if ((i + 1) % 5 === 0 || tableName === 'Categories' || i === prodData.length - 1) {
          console.log(`  📊 Progresso: ${i + 1}/${prodData.length} registros processados`);
        }
        
        // Para Categories, mostra detalhes do primeiro registro
        if (tableName === 'Categories' && i === 0) {
          console.log(`  📋 Primeiro registro Categories:`, row);
        }
        
      } catch (error) {
        errorCount++;
        console.error(`  ✗ Erro ao inserir linha ${i + 1} na tabela ${tableName}:`, error);
        console.error('  Dados da linha:', row);
        console.error('  Query:', query);
        console.error('  Values:', values);
      }
    }
    
    console.log(`  📈 Resultado final: ${successCount} sucessos, ${errorCount} erros`);
    
    // Verificação específica para Categories
    if (tableName === 'Categories') {
      try {
        const countResult = await localDataSource.query(`SELECT COUNT(*) as count FROM ${quotedLocalTableName}`);
        const actualCount = countResult[0].count;
        console.log(`  🔍 Verificação Categories: ${actualCount} registros encontrados na tabela local`);
        
        if (actualCount != successCount) {
          console.log(`  ⚠️  ATENÇÃO: Esperado ${successCount}, encontrado ${actualCount}`);
        }
      } catch (error) {
        console.error(`  ✗ Erro ao verificar contagem de Categories:`, error);
      }
    }
    
    console.log(`  ✓ ${prodData.length} registros copiados para ${tableName}`);
    
  } catch (error) {
    console.error(`  ✗ Erro ao copiar tabela ${tableName}:`, error);
  }
}

// Função para encontrar o nome real da tabela no banco local (pode ter case diferente)
async function findLocalTableName(tableName: string): Promise<string | null> {
  try {
    const result = await localDataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND LOWER(table_name) = LOWER($1)
      LIMIT 1
    `, [tableName]);
    
    return result.length > 0 ? result[0].table_name : null;
  } catch (error) {
    return null;
  }
}

// Função para descobrir colunas do tipo JSON em uma tabela
async function getJsonColumns(tableName: string): Promise<string[]> {
  try {
    const result = await localDataSource.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1 
      AND table_schema = 'public' 
      AND (data_type = 'json' OR data_type = 'jsonb')
    `, [tableName]);
    
    return result.map((row: any) => row.column_name.toLowerCase());
  } catch (error) {
    console.error(`Erro ao descobrir colunas JSON da tabela ${tableName}:`, error);
    return [];
  }
}

async function resetSequences() {
  console.log('\nResetando sequences...');
  
  try {
    // Busca todas as sequences - PostgreSQL >= 10
    const sequences = await localDataSource.query(`
      SELECT 
        n.nspname as schemaname,
        c.relname as sequencename,
        t.relname as tablename,
        a.attname as columnname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_depend d ON d.objid = c.oid
      JOIN pg_class t ON d.refobjid = t.oid
      JOIN pg_attribute a ON (d.refobjid, d.refobjsubid) = (a.attrelid, a.attnum)
      WHERE c.relkind = 'S'
      AND n.nspname = 'public'
    `);
    
    for (const seq of sequences) {
      try {
        // Pega o valor máximo da coluna
        const maxResult = await localDataSource.query(
          `SELECT COALESCE(MAX(${seq.columnname}), 0) as max_val FROM ${seq.tablename}`
        );
        
        const maxVal = maxResult[0].max_val;
        
        // Atualiza a sequence para o próximo valor
        await localDataSource.query(
          `SELECT setval('${seq.sequencename}', ${maxVal + 1}, false)`
        );
        
        console.log(`  ✓ Sequence ${seq.sequencename} resetada para ${maxVal + 1}`);
      } catch (error) {
        console.error(`  ✗ Erro ao resetar sequence ${seq.sequencename}:`, error);
      }
    }
  } catch (error) {
    console.error('Erro ao resetar sequences:', error);
  }
}

async function runMigrations() {
  console.log('Verificando migrations no banco local...');
  
  try {
    const pendingMigrations = await localDataSource.showMigrations();
    
    if (pendingMigrations) {
      console.log('  ⚠️  Existem migrations pendentes. Tentando executar...');
      try {
        await localDataSource.runMigrations();
        console.log('  ✓ Migrations executadas com sucesso');
      } catch (migrationError: any) {
        // Se o erro for relacionado a objetos já existentes, continua
        if (migrationError.code === '42P07' || // relation already exists
            migrationError.code === '42P01' || // relation does not exist  
            migrationError.message?.includes('already exists')) {
          console.log('  ⚠️  Algumas migrations falharam (objetos já existem), mas continuando...');
          console.log(`  📝 Erro: ${migrationError.message}`);
        } else {
          // Para outros erros, relança a exceção
          throw migrationError;
        }
      }
    } else {
      console.log('  ✓ Todas as migrations já foram executadas');
    }
  } catch (error: any) {
    console.error('  ✗ Erro ao verificar migrations:', error.message);
    console.log('  ⚠️  Continuando com a cópia mesmo assim...');
  }
}

async function main() {
  console.log('🚀 Iniciando cópia de dados de produção para local...\n');
  
  try {
    // Conecta aos bancos
    console.log('Conectando aos bancos de dados...');
    await prodDataSource.initialize();
    console.log('✓ Conectado ao banco de produção');
    
    await localDataSource.initialize();
    console.log('✓ Conectado ao banco local\n');
    
    // Executa migrations no banco local se necessário (pode ser pulado com variável de ambiente)
    if (process.env.SKIP_MIGRATIONS !== 'true') {
      await runMigrations();
    } else {
      console.log('⏭️  Pulando migrations (SKIP_MIGRATIONS=true)');
    }
    console.log('');
    
    // Descobre as tabelas disponíveis em produção
    console.log('Descobrindo tabelas disponíveis...');
    const prodTables = await getAvailableTables(prodDataSource);
    const localTables = await getAvailableTables(localDataSource);
    
    console.log(`  ✓ Produção: ${prodTables.length} tabelas encontradas`);
    console.log(`  ✓ Local: ${localTables.length} tabelas encontradas`);
    console.log(`  📋 Tabelas produção: ${prodTables.join(', ')}`);
    console.log(`  📋 Tabelas local: ${localTables.join(', ')}\n`);
    
    // Filtra tabelas que existem em ambos os bancos (case insensitive)
    const commonTables = prodTables.filter(prodTable => 
      localTables.some(localTable => 
        localTable.toLowerCase() === prodTable.toLowerCase()
      )
    );
    
    if (commonTables.length === 0) {
      console.log('❌ Nenhuma tabela comum encontrada entre os bancos!');
      console.log('Verifique se as migrations foram executadas corretamente.');
      return;
    }
    
    console.log(`Copiando ${commonTables.length} tabelas comuns...\n`);
    
    // Desabilita as foreign key constraints temporariamente
    await localDataSource.query('SET session_replication_role = replica;');
    
    // Primeiro, limpa todas as tabelas usando DELETE (respeita foreign keys)
    console.log('🗑️  Limpando todas as tabelas...');
    for (const tableName of commonTables) {
      try {
        const localTableName = await findLocalTableName(tableName);
        const quotedLocalTableName = localTableName ? `"${localTableName}"` : `"${tableName}"`;
        
        // Usa DELETE FROM ao invés de TRUNCATE para respeitar foreign keys
        const deleteResult = await localDataSource.query(`DELETE FROM ${quotedLocalTableName}`);
        console.log(`  ✓ ${tableName} limpa (${deleteResult[1] || 0} registros removidos)`);
        
        // Reseta a sequence se a tabela tiver uma coluna 'id'
        try {
          await localDataSource.query(`ALTER SEQUENCE ${quotedLocalTableName}_id_seq RESTART WITH 1`);
        } catch {
          // Ignora se não tiver sequence
        }
      } catch (error: any) {
        console.log(`  ⚠️  Erro ao limpar ${tableName}: ${error.message}`);
      }
    }
    console.log('');
    
    // Agora copia cada tabela (sem fazer TRUNCATE novamente)
    for (const tableName of commonTables) {
      await copyTable(tableName, false); // false = não fazer TRUNCATE
    }
    
    // Reabilita as foreign key constraints
    await localDataSource.query('SET session_replication_role = DEFAULT;');
    
    // Reseta as sequences
    await resetSequences();
    
    console.log('\n🎉 Cópia concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante a cópia:', error);
  } finally {
    // Fecha as conexões
    if (prodDataSource.isInitialized) {
      await prodDataSource.destroy();
      console.log('✓ Conexão com produção fechada');
    }
    
    if (localDataSource.isInitialized) {
      await localDataSource.destroy();
      console.log('✓ Conexão local fechada');
    }
  }
}

// Executa o script
main().catch(console.error); 