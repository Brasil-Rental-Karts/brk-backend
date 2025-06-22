import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewInscriptionTypeValues1750450200000 implements MigrationInterface {
    name = 'AddNewInscriptionTypeValues1750450200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Adicionar os novos valores ao enum existente
        await queryRunner.query(`ALTER TYPE "public"."Seasons_inscriptiontype_enum" ADD VALUE 'por_temporada'`);
        await queryRunner.query(`ALTER TYPE "public"."Seasons_inscriptiontype_enum" ADD VALUE 'por_etapa'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // PostgreSQL não permite remover valores de enum diretamente
        // Esta migração não pode ser revertida facilmente
        console.log('Rollback não suportado: PostgreSQL não permite remover valores de enum');
    }
} 