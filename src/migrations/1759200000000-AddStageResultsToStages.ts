import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStageResultsToStages1759200000000 implements MigrationInterface {
    name = 'AddStageResultsToStages1759200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "Stages"
            ADD COLUMN "stage_results" JSONB
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "Stages"
            DROP COLUMN "stage_results"
        `);
    }
} 