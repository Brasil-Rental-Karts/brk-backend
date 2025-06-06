import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCategoriesTable1751000000000 implements MigrationInterface {
    name = 'CreateCategoriesTable1751000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create Categories table
        await queryRunner.query(`
            CREATE TABLE "Categories" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "name" character varying(75) NOT NULL, 
                "ballast" character varying(10) NOT NULL, 
                "maxPilots" integer NOT NULL, 
                "batteryQuantity" integer NOT NULL, 
                "startingGridFormat" character varying(255) NOT NULL, 
                "minimumAge" integer NOT NULL, 
                CONSTRAINT "PK_Categories" PRIMARY KEY ("id")
            )
        `);
        
        // Add unique constraint for category name
        await queryRunner.query(`
            ALTER TABLE "Categories" 
            ADD CONSTRAINT "UQ_Categories_name" 
            UNIQUE ("name")
        `);
        
        // Create indexes for better query performance
        await queryRunner.query(`CREATE INDEX "IDX_Categories_name" ON "Categories" ("name")`);
        await queryRunner.query(`CREATE INDEX "IDX_Categories_ballast" ON "Categories" ("ballast")`);
        await queryRunner.query(`CREATE INDEX "IDX_Categories_maxPilots" ON "Categories" ("maxPilots")`);
        await queryRunner.query(`CREATE INDEX "IDX_Categories_minimumAge" ON "Categories" ("minimumAge")`);
        
        // Create trigger for the Categories table
        await queryRunner.query(`
            CREATE TRIGGER categories_notify_trigger
            AFTER INSERT OR UPDATE OR DELETE ON "Categories"
            FOR EACH ROW EXECUTE FUNCTION notify_database_events();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove trigger from Categories table
        await queryRunner.query(`DROP TRIGGER IF EXISTS categories_notify_trigger ON "Categories"`);
        
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_Categories_minimumAge"`);
        await queryRunner.query(`DROP INDEX "IDX_Categories_maxPilots"`);
        await queryRunner.query(`DROP INDEX "IDX_Categories_ballast"`);
        await queryRunner.query(`DROP INDEX "IDX_Categories_name"`);
        
        // Drop the unique constraint
        await queryRunner.query(`ALTER TABLE "Categories" DROP CONSTRAINT "UQ_Categories_name"`);
        
        // Drop Categories table
        await queryRunner.query(`DROP TABLE "Categories"`);
    }
} 