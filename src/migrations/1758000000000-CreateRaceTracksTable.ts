import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRaceTracksTable1758000000000 implements MigrationInterface {
  name = 'CreateRaceTracksTable1758000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create RaceTracks table with all fields
    await queryRunner.query(`
            CREATE TABLE "RaceTracks" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "name" character varying(100) NOT NULL, 
                "city" character varying(100) NOT NULL, 
                "state" character varying(2) NOT NULL, 
                "address" text NOT NULL, 
                "trackLayouts" jsonb NOT NULL, 
                "defaultFleets" jsonb NOT NULL, 
                "generalInfo" text, 
                "isActive" boolean NOT NULL DEFAULT true, 
                CONSTRAINT "PK_RaceTracks" PRIMARY KEY ("id")
            )
        `);

    // Create indexes for better query performance
    await queryRunner.query(
      `CREATE INDEX "IDX_RaceTracks_name" ON "RaceTracks" ("name")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_RaceTracks_city" ON "RaceTracks" ("city")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_RaceTracks_state" ON "RaceTracks" ("state")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_RaceTracks_isActive" ON "RaceTracks" ("isActive")`
    );

    // Add comments to columns
    await queryRunner.query(`
            COMMENT ON COLUMN "RaceTracks"."trackLayouts" IS 'Array de configurações de traçados disponíveis no kartódromo'
        `);

    await queryRunner.query(`
            COMMENT ON COLUMN "RaceTracks"."defaultFleets" IS 'Array de configurações de frotas padrão disponíveis no kartódromo'
        `);

    // Create trigger for the RaceTracks table
    await queryRunner.query(`
            CREATE TRIGGER race_tracks_notify_trigger
            AFTER INSERT OR UPDATE OR DELETE ON "RaceTracks"
            FOR EACH ROW EXECUTE FUNCTION notify_database_events();
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove trigger from RaceTracks table
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS race_tracks_notify_trigger ON "RaceTracks"`
    );

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_RaceTracks_isActive"`);
    await queryRunner.query(`DROP INDEX "IDX_RaceTracks_state"`);
    await queryRunner.query(`DROP INDEX "IDX_RaceTracks_city"`);
    await queryRunner.query(`DROP INDEX "IDX_RaceTracks_name"`);

    // Drop RaceTracks table
    await queryRunner.query(`DROP TABLE "RaceTracks"`);
  }
}
