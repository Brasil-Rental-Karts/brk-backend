import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRegulationsTable1752000000001 implements MigrationInterface {
    name = 'CreateRegulationsTable1752000000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create Regulations table
        await queryRunner.query(`
            CREATE TABLE "Regulations" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "title" character varying(255) NOT NULL, 
                "content" text NOT NULL, 
                "order" integer NOT NULL, 
                "isActive" boolean NOT NULL DEFAULT true, 
                "seasonId" uuid NOT NULL, 
                CONSTRAINT "PK_Regulations" PRIMARY KEY ("id")
            )
        `);
        
        // Add foreign key constraint for season
        await queryRunner.query(`
            ALTER TABLE "Regulations" 
            ADD CONSTRAINT "FK_Regulations_Seasons_seasonId" 
            FOREIGN KEY ("seasonId") 
            REFERENCES "Seasons"("id") 
            ON DELETE CASCADE 
            ON UPDATE NO ACTION
        `);
        
        // Create indexes for better query performance
        await queryRunner.query(`CREATE INDEX "IDX_Regulations_seasonId" ON "Regulations" ("seasonId")`);
        await queryRunner.query(`CREATE INDEX "IDX_Regulations_order" ON "Regulations" ("order")`);
        await queryRunner.query(`CREATE INDEX "IDX_Regulations_isActive" ON "Regulations" ("isActive")`);
        await queryRunner.query(`CREATE INDEX "IDX_Regulations_seasonId_order" ON "Regulations" ("seasonId", "order")`);
        
        // Create trigger for the Regulations table
        await queryRunner.query(`
            CREATE TRIGGER regulations_notify_trigger
            AFTER INSERT OR UPDATE OR DELETE ON "Regulations"
            FOR EACH ROW EXECUTE FUNCTION notify_database_events();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove trigger from Regulations table
        await queryRunner.query(`DROP TRIGGER IF EXISTS regulations_notify_trigger ON "Regulations"`);
        
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_Regulations_seasonId_order"`);
        await queryRunner.query(`DROP INDEX "IDX_Regulations_isActive"`);
        await queryRunner.query(`DROP INDEX "IDX_Regulations_order"`);
        await queryRunner.query(`DROP INDEX "IDX_Regulations_seasonId"`);
        
        // Drop the foreign key constraint
        await queryRunner.query(`ALTER TABLE "Regulations" DROP CONSTRAINT "FK_Regulations_Seasons_seasonId"`);
        
        // Drop Regulations table
        await queryRunner.query(`DROP TABLE "Regulations"`);
    }
} 