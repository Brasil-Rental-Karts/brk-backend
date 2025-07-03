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

export class AddFleetsToStages1710000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Stages" ADD COLUMN "fleets" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Stages" DROP COLUMN "fleets"`);
    }
} 