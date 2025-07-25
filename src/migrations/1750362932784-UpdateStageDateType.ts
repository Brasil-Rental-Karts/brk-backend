import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateStageDateType1750362932784 implements MigrationInterface {
  name = 'UpdateStageDateType1750362932784';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "Stages" ADD "date_new" TIMESTAMP`);
    await queryRunner.query(`UPDATE "Stages" SET "date_new" = "date"`);
    await queryRunner.query(
      `UPDATE "Stages" SET "date_new" = NOW() WHERE "date_new" IS NULL`
    );
    await queryRunner.query(`ALTER TABLE "Stages" DROP COLUMN "date"`);
    await queryRunner.query(
      `ALTER TABLE "Stages" RENAME COLUMN "date_new" TO "date"`
    );
    await queryRunner.query(
      `ALTER TABLE "Stages" ALTER COLUMN "date" SET NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "Stages" ADD "date_old" date`);
    await queryRunner.query(`UPDATE "Stages" SET "date_old" = "date"::date`);
    await queryRunner.query(`ALTER TABLE "Stages" DROP COLUMN "date"`);
    await queryRunner.query(
      `ALTER TABLE "Stages" RENAME COLUMN "date_old" TO "date"`
    );
    await queryRunner.query(
      `ALTER TABLE "Stages" ALTER COLUMN "date" SET NOT NULL`
    );
  }
}
