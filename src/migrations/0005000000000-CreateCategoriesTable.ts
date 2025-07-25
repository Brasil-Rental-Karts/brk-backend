import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCategoriesTable0005000000000 implements MigrationInterface {
  name = 'CreateCategoriesTable0005000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create Categories table with all current fields including batteriesConfig
    await queryRunner.query(`
            CREATE TABLE "Categories" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "name" character varying(75) NOT NULL, 
                "ballast" character varying(10) NOT NULL, 
                "maxPilots" integer NOT NULL, 
                "batteriesConfig" jsonb NOT NULL DEFAULT '[]'::jsonb, 
                "minimumAge" integer NOT NULL, 
                "seasonId" uuid NOT NULL, 
                CONSTRAINT "PK_Categories" PRIMARY KEY ("id")
            )
        `);

    // Add foreign key constraint for season
    await queryRunner.query(`
            ALTER TABLE "Categories" 
            ADD CONSTRAINT "FK_Categories_Seasons_seasonId" 
            FOREIGN KEY ("seasonId") 
            REFERENCES "Seasons"("id") 
            ON DELETE CASCADE 
            ON UPDATE NO ACTION
        `);

    // Add unique constraint for category name within season
    await queryRunner.query(`
            ALTER TABLE "Categories" 
            ADD CONSTRAINT "UQ_Categories_season_name" 
            UNIQUE ("seasonId", "name")
        `);

    // Create indexes for better query performance
    await queryRunner.query(
      `CREATE INDEX "IDX_Categories_seasonId" ON "Categories" ("seasonId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Categories_name" ON "Categories" ("name")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Categories_ballast" ON "Categories" ("ballast")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Categories_maxPilots" ON "Categories" ("maxPilots")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Categories_minimumAge" ON "Categories" ("minimumAge")`
    );

    // Add comment to the batteriesConfig column
    await queryRunner.query(`
            COMMENT ON COLUMN "Categories"."batteriesConfig" IS 'Configuração das baterias em formato JSON'
        `);

    // Create trigger for the Categories table
    await queryRunner.query(`
            CREATE TRIGGER categories_notify_trigger
            AFTER INSERT OR UPDATE OR DELETE ON "Categories"
            FOR EACH ROW EXECUTE FUNCTION notify_database_events();
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove trigger from Categories table
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS categories_notify_trigger ON "Categories"`
    );

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_Categories_minimumAge"`);
    await queryRunner.query(`DROP INDEX "IDX_Categories_maxPilots"`);
    await queryRunner.query(`DROP INDEX "IDX_Categories_ballast"`);
    await queryRunner.query(`DROP INDEX "IDX_Categories_name"`);
    await queryRunner.query(`DROP INDEX "IDX_Categories_seasonId"`);

    // Drop the unique constraint
    await queryRunner.query(
      `ALTER TABLE "Categories" DROP CONSTRAINT "UQ_Categories_season_name"`
    );

    // Drop foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "Categories" DROP CONSTRAINT "FK_Categories_Seasons_seasonId"`
    );

    // Drop Categories table
    await queryRunner.query(`DROP TABLE "Categories"`);
  }
}
