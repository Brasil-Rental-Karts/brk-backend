import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsImportedToPenalties1770000000000 implements MigrationInterface {
    name = 'AddIsImportedToPenalties1770000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "penalties" ADD "isImported" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "penalties" DROP COLUMN "isImported"`);
    }
} 