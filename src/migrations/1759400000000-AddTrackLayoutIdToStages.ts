import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTrackLayoutIdToStages1759400000000 implements MigrationInterface {
    name = 'AddTrackLayoutIdToStages1759400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Adicionar coluna trackLayoutId na tabela Stages
        await queryRunner.query(`
            ALTER TABLE "Stages" 
            ADD COLUMN "trackLayoutId" character varying(255)
        `);
        
        // Adicionar comentário na coluna
        await queryRunner.query(`
            COMMENT ON COLUMN "Stages"."trackLayoutId" IS 'ID do traçado selecionado para esta etapa (pode ser null se não definido)'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remover coluna trackLayoutId da tabela Stages
        await queryRunner.query(`
            ALTER TABLE "Stages" 
            DROP COLUMN "trackLayoutId"
        `);
    }
} 