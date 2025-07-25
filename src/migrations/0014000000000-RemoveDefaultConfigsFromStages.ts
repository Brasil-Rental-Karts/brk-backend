import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveDefaultConfigsFromStages0014000000000
  implements MigrationInterface
{
  name = 'RemoveDefaultConfigsFromStages0014000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign key constraint for default scoring system
    await queryRunner.query(`
            ALTER TABLE "Stages" 
            DROP CONSTRAINT IF EXISTS "FK_Stages_ScoringSystem_defaultScoringSystemId"
        `);

    // Remove foreign key constraint for default grid type
    await queryRunner.query(`
            ALTER TABLE "Stages" 
            DROP CONSTRAINT IF EXISTS "FK_Stages_GridTypes_defaultGridTypeId"
        `);

    // Remove the columns
    await queryRunner.query(`
            ALTER TABLE "Stages" 
            DROP COLUMN IF EXISTS "defaultScoringSystemId"
        `);

    await queryRunner.query(`
            ALTER TABLE "Stages" 
            DROP COLUMN IF EXISTS "defaultGridTypeId"
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back the columns
    await queryRunner.query(`
            ALTER TABLE "Stages" 
            ADD COLUMN "defaultGridTypeId" uuid
        `);

    await queryRunner.query(`
            ALTER TABLE "Stages" 
            ADD COLUMN "defaultScoringSystemId" uuid
        `);

    // Add back foreign key constraint for default grid type
    await queryRunner.query(`
            ALTER TABLE "Stages" 
            ADD CONSTRAINT "FK_Stages_GridTypes_defaultGridTypeId" 
            FOREIGN KEY ("defaultGridTypeId") 
            REFERENCES "GridTypes"("id") 
            ON DELETE SET NULL 
            ON UPDATE NO ACTION
        `);

    // Add back foreign key constraint for default scoring system
    await queryRunner.query(`
            ALTER TABLE "Stages" 
            ADD CONSTRAINT "FK_Stages_ScoringSystem_defaultScoringSystemId" 
            FOREIGN KEY ("defaultScoringSystemId") 
            REFERENCES "ScoringSystem"("id") 
            ON DELETE SET NULL 
            ON UPDATE NO ACTION
        `);
  }
}
