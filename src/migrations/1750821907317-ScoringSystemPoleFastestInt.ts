import { MigrationInterface, QueryRunner } from 'typeorm';

export class ScoringSystemPoleFastestInt1750821907317
  implements MigrationInterface
{
  name = 'ScoringSystemPoleFastestInt1750821907317';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ScoringSystem" ALTER COLUMN "polePositionPoints" TYPE integer USING ROUND("polePositionPoints")`
    );
    await queryRunner.query(
      `ALTER TABLE "ScoringSystem" ALTER COLUMN "fastestLapPoints" TYPE integer USING ROUND("fastestLapPoints")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ScoringSystem" ALTER COLUMN "polePositionPoints" TYPE numeric(5,2) USING "polePositionPoints"::numeric(5,2)`
    );
    await queryRunner.query(
      `ALTER TABLE "ScoringSystem" ALTER COLUMN "fastestLapPoints" TYPE numeric(5,2) USING "fastestLapPoints"::numeric(5,2)`
    );
  }
}
