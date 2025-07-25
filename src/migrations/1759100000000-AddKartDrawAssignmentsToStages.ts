import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKartDrawAssignmentsToStages1759100000000
  implements MigrationInterface
{
  name = 'AddKartDrawAssignmentsToStages1759100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "Stages"
            ADD COLUMN "kart_draw_assignments" JSONB
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "Stages"
            DROP COLUMN "kart_draw_assignments"
        `);
  }
}
