import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateInscriptionTypeData1750450300000 implements MigrationInterface {
    name = 'UpdateInscriptionTypeData1750450300000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Atualizar os dados existentes para usar os novos valores
        await queryRunner.query(`
            UPDATE "Seasons" 
            SET "inscriptionType" = 'por_temporada' 
            WHERE "inscriptionType" IN ('mensal', 'anual', 'semestral', 'trimestral')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Converter os dados de volta para valores antigos
        await queryRunner.query(`
            UPDATE "Seasons" 
            SET "inscriptionType" = 'anual' 
            WHERE "inscriptionType" IN ('por_temporada', 'por_etapa')
        `);
    }
} 