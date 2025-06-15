import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStagesTable0013000000000 implements MigrationInterface {
    name = 'CreateStagesTable0013000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create Stages table with all fields
        await queryRunner.query(`
            CREATE TABLE "Stages" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "name" character varying(255) NOT NULL, 
                "date" DATE NOT NULL, 
                "time" TIME NOT NULL, 
                "kartodrome" character varying(255) NOT NULL, 
                "kartodromeAddress" text NOT NULL, 
                "streamLink" character varying(500), 
                "seasonId" uuid NOT NULL, 
                "categoryIds" text NOT NULL, 
                "defaultGridTypeId" uuid, 
                "defaultScoringSystemId" uuid, 
                "doublePoints" boolean NOT NULL DEFAULT false, 
                "briefing" text, 
                "briefingTime" TIME, 
                CONSTRAINT "PK_Stages" PRIMARY KEY ("id")
            )
        `);
        
        // Add foreign key constraint for season
        await queryRunner.query(`
            ALTER TABLE "Stages" 
            ADD CONSTRAINT "FK_Stages_Seasons_seasonId" 
            FOREIGN KEY ("seasonId") 
            REFERENCES "Seasons"("id") 
            ON DELETE CASCADE 
            ON UPDATE NO ACTION
        `);
        
        // Add foreign key constraint for default grid type
        await queryRunner.query(`
            ALTER TABLE "Stages" 
            ADD CONSTRAINT "FK_Stages_GridTypes_defaultGridTypeId" 
            FOREIGN KEY ("defaultGridTypeId") 
            REFERENCES "GridTypes"("id") 
            ON DELETE SET NULL 
            ON UPDATE NO ACTION
        `);
        
        // Add foreign key constraint for default scoring system
        await queryRunner.query(`
            ALTER TABLE "Stages" 
            ADD CONSTRAINT "FK_Stages_ScoringSystem_defaultScoringSystemId" 
            FOREIGN KEY ("defaultScoringSystemId") 
            REFERENCES "ScoringSystem"("id") 
            ON DELETE SET NULL 
            ON UPDATE NO ACTION
        `);
        
        // Create indexes for better query performance
        await queryRunner.query(`CREATE INDEX "IDX_Stages_seasonId" ON "Stages" ("seasonId")`);
        await queryRunner.query(`CREATE INDEX "IDX_Stages_date" ON "Stages" ("date")`);
        await queryRunner.query(`CREATE INDEX "IDX_Stages_kartodrome" ON "Stages" ("kartodrome")`);
        await queryRunner.query(`CREATE INDEX "IDX_Stages_name" ON "Stages" ("name")`);
        
        // Add comment to categoryIds column
        await queryRunner.query(`
            COMMENT ON COLUMN "Stages"."categoryIds" IS 'Array de IDs das categorias participantes desta etapa'
        `);
        
        // Create trigger for the Stages table
        await queryRunner.query(`
            CREATE TRIGGER stages_notify_trigger
            AFTER INSERT OR UPDATE OR DELETE ON "Stages"
            FOR EACH ROW EXECUTE FUNCTION notify_database_events();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove trigger from Stages table
        await queryRunner.query(`DROP TRIGGER IF EXISTS stages_notify_trigger ON "Stages"`);
        
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_Stages_name"`);
        await queryRunner.query(`DROP INDEX "IDX_Stages_kartodrome"`);
        await queryRunner.query(`DROP INDEX "IDX_Stages_date"`);
        await queryRunner.query(`DROP INDEX "IDX_Stages_seasonId"`);
        
        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "Stages" DROP CONSTRAINT "FK_Stages_ScoringSystem_defaultScoringSystemId"`);
        await queryRunner.query(`ALTER TABLE "Stages" DROP CONSTRAINT "FK_Stages_GridTypes_defaultGridTypeId"`);
        await queryRunner.query(`ALTER TABLE "Stages" DROP CONSTRAINT "FK_Stages_Seasons_seasonId"`);
        
        // Drop Stages table
        await queryRunner.query(`DROP TABLE "Stages"`);
    }
} 