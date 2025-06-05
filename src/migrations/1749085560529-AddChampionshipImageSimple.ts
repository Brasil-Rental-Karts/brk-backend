import { MigrationInterface, QueryRunner } from "typeorm";

export class AddChampionshipImageSimple1749085560529 implements MigrationInterface {
    name = 'AddChampionshipImageSimple1749085560529'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Championships" ADD "championshipImage" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Championships" DROP COLUMN "championshipImage"`);
    }
} 