import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDoubleRoundPairToStages1776000000000 implements MigrationInterface {
  name = 'AddDoubleRoundPairToStages1776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Stages"
      ADD COLUMN "doubleRoundPairId" uuid NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Stages"
      DROP COLUMN "doubleRoundPairId"
    `);
  }
}


