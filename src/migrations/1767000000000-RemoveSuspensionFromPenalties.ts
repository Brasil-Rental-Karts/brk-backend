import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveSuspensionFromPenalties1767000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove suspension-related columns
    await queryRunner.query(
      `ALTER TABLE "penalties" DROP COLUMN IF EXISTS "suspensionStages"`
    );
    await queryRunner.query(
      `ALTER TABLE "penalties" DROP COLUMN IF EXISTS "suspensionUntil"`
    );

    // Update the enum to remove 'suspension'
    await queryRunner.query(`
      ALTER TYPE "penalties_type_enum" RENAME TO "penalties_type_enum_old"
    `);

    await queryRunner.query(`
      CREATE TYPE "penalties_type_enum" AS ENUM('disqualification', 'time_penalty', 'position_penalty', 'warning')
    `);

    await queryRunner.query(`
      ALTER TABLE "penalties" ALTER COLUMN "type" TYPE "penalties_type_enum" USING "type"::text::"penalties_type_enum"
    `);

    await queryRunner.query(`DROP TYPE "penalties_type_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the old enum
    await queryRunner.query(`
      ALTER TYPE "penalties_type_enum" RENAME TO "penalties_type_enum_new"
    `);

    await queryRunner.query(`
      CREATE TYPE "penalties_type_enum" AS ENUM('disqualification', 'time_penalty', 'position_penalty', 'suspension', 'warning')
    `);

    await queryRunner.query(`
      ALTER TABLE "penalties" ALTER COLUMN "type" TYPE "penalties_type_enum" USING "type"::text::"penalties_type_enum"
    `);

    await queryRunner.query(`DROP TYPE "penalties_type_enum_new"`);

    // Recreate suspension-related columns
    await queryRunner.query(
      `ALTER TABLE "penalties" ADD COLUMN "suspensionStages" integer`
    );
    await queryRunner.query(
      `ALTER TABLE "penalties" ADD COLUMN "suspensionUntil" date`
    );
  }
}
