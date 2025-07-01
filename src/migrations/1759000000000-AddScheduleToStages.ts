import { MigrationInterface, QueryRunner } from "typeorm";

export class AddScheduleToStages1759000000000 implements MigrationInterface {
    name = 'AddScheduleToStages1759000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Stages" ADD "schedule" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Stages" DROP COLUMN "schedule"`);
    }
} 