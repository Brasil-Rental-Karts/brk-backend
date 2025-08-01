import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveIsActiveFromRegulations1751295234318
  implements MigrationInterface
{
  name = 'RemoveIsActiveFromRegulations1751295234318';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if Regulations table exists before trying to modify it
    const tableExists = await queryRunner.hasTable('Regulations');

    if (tableExists) {
      // Check if isActive column exists before trying to remove it
      const hasColumn = await queryRunner.hasColumn('Regulations', 'isActive');

      if (hasColumn) {
        // Remove the isActive column from Regulations table
        await queryRunner.query(
          `ALTER TABLE "Regulations" DROP COLUMN "isActive"`
        );

        // Remove the index for isActive column
        await queryRunner.query(
          `DROP INDEX IF EXISTS "IDX_Regulations_isActive"`
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if Regulations table exists before trying to modify it
    const tableExists = await queryRunner.hasTable('Regulations');

    if (tableExists) {
      // Check if isActive column doesn't exist before trying to add it
      const hasColumn = await queryRunner.hasColumn('Regulations', 'isActive');

      if (!hasColumn) {
        // Add back the isActive column with default value true
        await queryRunner.query(
          `ALTER TABLE "Regulations" ADD "isActive" boolean NOT NULL DEFAULT true`
        );

        // Recreate the index for isActive column
        await queryRunner.query(
          `CREATE INDEX "IDX_Regulations_isActive" ON "Regulations" ("isActive")`
        );
      }
    }
  }
}
