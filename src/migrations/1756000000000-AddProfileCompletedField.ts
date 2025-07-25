import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProfileCompletedField1756000000000
  implements MigrationInterface
{
  name = 'AddProfileCompletedField1756000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "MemberProfiles" 
            ADD COLUMN "profileCompleted" boolean NOT NULL DEFAULT false
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "MemberProfiles" 
            DROP COLUMN "profileCompleted"
        `);
  }
}
