import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSlugToSeasonsSafe1750450500000 implements MigrationInterface {
    name = 'AddSlugToSeasonsSafe1750450500000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Primeiro, adicionar a coluna slug como nullable
        await queryRunner.query(`ALTER TABLE "Seasons" ADD "slug" character varying(100)`);
        
        // Função para criar slug (simplificada)
        await queryRunner.query(`
            UPDATE "Seasons" 
            SET "slug" = LOWER(
                REGEXP_REPLACE(
                    REGEXP_REPLACE(
                        REGEXP_REPLACE(name, '[áàâãäå]', 'a', 'gi'),
                        '[éèêë]', 'e', 'gi'
                    ),
                    '[^a-z0-9]+', '-', 'gi'
                )
            )
        `);
        
        // Tornar a coluna NOT NULL após popular os dados
        await queryRunner.query(`ALTER TABLE "Seasons" ALTER COLUMN "slug" SET NOT NULL`);
        
        // Adicionar constraint de unicidade
        await queryRunner.query(`ALTER TABLE "Seasons" ADD CONSTRAINT "UQ_seasons_slug" UNIQUE ("slug")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Seasons" DROP CONSTRAINT "UQ_seasons_slug"`);
        await queryRunner.query(`ALTER TABLE "Seasons" DROP COLUMN "slug"`);
    }
} 