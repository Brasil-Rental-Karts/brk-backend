import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveVipPreregisterTable1771000000000
  implements MigrationInterface
{
  name = 'RemoveVipPreregisterTable1771000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove trigger from vip_preregister table
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS vip_preregister_notify_trigger ON "vip_preregister"`
    );

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vip_preregister_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vip_preregister_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vip_preregister_email"`);

    // Drop vip_preregister table
    await queryRunner.query(`DROP TABLE IF EXISTS "vip_preregister"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate vip_preregister table
    await queryRunner.query(`
      CREATE TABLE "vip_preregister" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "name" character varying(255) NOT NULL, 
        "email" character varying(255) NOT NULL, 
        CONSTRAINT "UQ_158477db93c316f97243ed7cb90" UNIQUE ("email"), 
        CONSTRAINT "PK_c60df9630d14d19d010fd1bfb68" PRIMARY KEY ("id")
      )
    `);

    // Recreate indexes for better performance
    await queryRunner.query(
      `CREATE INDEX "IDX_vip_preregister_email" ON "vip_preregister" ("email")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_vip_preregister_name" ON "vip_preregister" ("name")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_vip_preregister_createdAt" ON "vip_preregister" ("createdAt")`
    );

    // Recreate trigger for the vip_preregister table
    await queryRunner.query(`
      CREATE TRIGGER vip_preregister_notify_trigger
      AFTER INSERT OR UPDATE OR DELETE ON "vip_preregister"
      FOR EACH ROW EXECUTE FUNCTION notify_database_events();
    `);
  }
} 