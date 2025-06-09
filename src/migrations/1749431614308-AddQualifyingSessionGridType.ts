import { MigrationInterface, QueryRunner } from "typeorm";

export class AddQualifyingSessionGridType1749431614308 implements MigrationInterface {
    name = 'AddQualifyingSessionGridType1749431614308'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Adicionar o campo qualifyingDuration
        await queryRunner.query(`ALTER TABLE "GridTypes" ADD "qualifyingDuration" integer`);
        
        // Remover o constraint antigo
        await queryRunner.query(`ALTER TABLE "GridTypes" DROP CONSTRAINT "GridTypes_type_check"`);
        
        // Adicionar o novo constraint incluindo qualifying_session
        await queryRunner.query(`
            ALTER TABLE "GridTypes" 
            ADD CONSTRAINT "GridTypes_type_check" 
            CHECK ("type" IN ('super_pole', 'inverted', 'inverted_partial', 'qualifying_session'))
        `);
        
        // Inserir o novo tipo pré-definido para todos os campeonatos existentes
        await queryRunner.query(`
            INSERT INTO "GridTypes" ("name", "description", "type", "isActive", "isDefault", "qualifyingDuration", "championshipId", "createdAt", "updatedAt")
            SELECT 
                'Classificação 5min',
                'Sessão de classificação por tempo determinado. Posições definidas pela volta mais rápida durante a sessão',
                'qualifying_session',
                true,
                false,
                5,
                c."id",
                NOW(),
                NOW()
            FROM "Championships" c
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remover todos os grid types do tipo qualifying_session
        await queryRunner.query(`DELETE FROM "GridTypes" WHERE type = 'qualifying_session'`);
        
        // Remover o campo qualifyingDuration
        await queryRunner.query(`ALTER TABLE "GridTypes" DROP COLUMN "qualifyingDuration"`);
        
        // Restaurar o constraint original
        await queryRunner.query(`ALTER TABLE "GridTypes" DROP CONSTRAINT "GridTypes_type_check"`);
        await queryRunner.query(`
            ALTER TABLE "GridTypes" 
            ADD CONSTRAINT "GridTypes_type_check" 
            CHECK ("type" IN ('super_pole', 'inverted', 'inverted_partial'))
        `);
    }
} 