import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveDescriptionAndLeaderLapPointsFromScoringSystem1750821907316
  implements MigrationInterface
{
  name = 'RemoveDescriptionAndLeaderLapPointsFromScoringSystem1750821907316';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remover coluna description
    await queryRunner.query(
      `ALTER TABLE "ScoringSystem" DROP COLUMN "description"`
    );

    // Remover coluna leaderLapPoints
    await queryRunner.query(
      `ALTER TABLE "ScoringSystem" DROP COLUMN "leaderLapPoints"`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Adicionar coluna description de volta
    await queryRunner.query(
      `ALTER TABLE "ScoringSystem" ADD "description" text`
    );

    // Adicionar coluna leaderLapPoints de volta
    await queryRunner.query(
      `ALTER TABLE "ScoringSystem" ADD "leaderLapPoints" numeric(5,2) NOT NULL DEFAULT '0'`
    );
  }
}
