import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRegulationsEnabledToSeasons1751298000000
  implements MigrationInterface
{
  name = 'AddRegulationsEnabledToSeasons1751298000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Seasons" ADD "regulationsEnabled" boolean NOT NULL DEFAULT false`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Seasons" DROP COLUMN "regulationsEnabled"`
    );
  }
}
