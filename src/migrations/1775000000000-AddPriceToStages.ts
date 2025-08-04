import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPriceToStages1775000000000 implements MigrationInterface {
  name = 'AddPriceToStages1775000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Stages" 
      ADD COLUMN "price" NUMERIC(10,2) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "Stages" 
      DROP COLUMN "price"
    `);
  }
} 