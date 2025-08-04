import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDoubleRoundToStages1774000000000 implements MigrationInterface {
  name = 'AddDoubleRoundToStages1774000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Stages" 
      ADD COLUMN "doubleRound" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Stages" 
      DROP COLUMN "doubleRound"
    `);
  }
} 