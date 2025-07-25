import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBatteryToPenalties1768000000000 implements MigrationInterface {
  name = 'AddBatteryToPenalties1768000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "penalties" ADD "batteryIndex" integer`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "penalties" DROP COLUMN "batteryIndex"`
    );
  }
}
