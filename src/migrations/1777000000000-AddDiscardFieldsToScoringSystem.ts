import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDiscardFieldsToScoringSystem1777000000000 implements MigrationInterface {
  name = 'AddDiscardFieldsToScoringSystem1777000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "ScoringSystem" ADD "discardMode" character varying(20) NOT NULL DEFAULT 'none'`);
    await queryRunner.query(`ALTER TABLE "ScoringSystem" ADD "discardCount" integer NOT NULL DEFAULT 0`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "ScoringSystem" DROP COLUMN "discardCount"`);
    await queryRunner.query(`ALTER TABLE "ScoringSystem" DROP COLUMN "discardMode"`);
  }
}


