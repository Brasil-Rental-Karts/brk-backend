import { MigrationInterface, QueryRunner } from "typeorm";

export class FixUuidTypes1750501002000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Garantir que as extensões do PostgreSQL estejam habilitadas
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        
        // Primeiro, verificar e corrigir as colunas que estão causando problemas de FK
        console.log('Fixing UUID types in database...');
        
        try {
            // Verificar tipo da coluna seasonId na tabela Stages
            const stagesSeasonIdResult = await queryRunner.query(`
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'Stages' AND column_name = 'seasonId'
            `);
            
            if (stagesSeasonIdResult.length > 0) {
                console.log(`Stages.seasonId type: ${stagesSeasonIdResult[0].data_type}`);
                
                if (stagesSeasonIdResult[0].data_type !== 'uuid') {
                    console.log('Converting Stages.seasonId to UUID...');
                    await queryRunner.query(`
                        ALTER TABLE "Stages" 
                        ALTER COLUMN "seasonId" TYPE uuid 
                        USING "seasonId"::uuid
                    `);
                }
            }
            
            // Verificar tipo da coluna id na tabela Stages
            const stagesIdResult = await queryRunner.query(`
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'Stages' AND column_name = 'id'
            `);
            
            if (stagesIdResult.length > 0 && stagesIdResult[0].data_type !== 'uuid') {
                console.log('Converting Stages.id to UUID...');
                await queryRunner.query(`
                    ALTER TABLE "Stages" 
                    ALTER COLUMN "id" TYPE uuid 
                    USING "id"::uuid
                `);
            }
            
        } catch (error: any) {
            console.log(`Error converting Stages columns: ${error.message}`);
        }
        
        // Verificar e corrigir tipos UUID em todas as outras tabelas principais
        const tables = [
            { table: 'Championships', column: 'id' },
            { table: 'Championships', column: 'ownerId' },
            { table: 'Seasons', column: 'id' },
            { table: 'Seasons', column: 'championshipId' },
            { table: 'Categories', column: 'id' },
            { table: 'Categories', column: 'seasonId' }
        ];

        for (const { table, column } of tables) {
            try {
                // Verificar se a coluna existe e seu tipo
                const result = await queryRunner.query(`
                    SELECT data_type 
                    FROM information_schema.columns 
                    WHERE table_name = $1 AND column_name = $2
                `, [table, column]);

                if (result.length > 0 && result[0].data_type !== 'uuid') {
                    console.log(`Converting ${table}.${column} from ${result[0].data_type} to uuid`);
                    
                    // Converter para UUID se necessário
                    await queryRunner.query(`
                        ALTER TABLE "${table}" 
                        ALTER COLUMN "${column}" TYPE uuid 
                        USING "${column}"::uuid
                    `);
                }
            } catch (error: any) {
                console.log(`Skipping ${table}.${column}: ${error.message}`);
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Não fazemos rollback de tipos UUID para string por segurança
        console.log('UUID type conversion rollback skipped for data safety');
    }
} 