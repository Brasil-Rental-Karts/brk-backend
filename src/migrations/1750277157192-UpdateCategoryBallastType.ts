import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateCategoryBallastType1750277157192
  implements MigrationInterface
{
  name = 'UpdateCategoryBallastType1750277157192';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Categories" ALTER COLUMN "ballast" TYPE integer USING regexp_replace("ballast", '\\D', '', 'g')::integer`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Categories" ALTER COLUMN "ballast" TYPE character varying(10) USING "ballast"::text`
    );
  }
}
