import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSeasonsTable0004000000000 implements MigrationInterface {
    name = 'CreateSeasonsTable0004000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create SeasonStatus enum
        await queryRunner.query(`CREATE TYPE "public"."Seasons_status_enum" AS ENUM('agendado', 'em_andamento', 'cancelado', 'finalizado')`);
        
        // Create InscriptionType enum  
        await queryRunner.query(`CREATE TYPE "public"."Seasons_inscriptiontype_enum" AS ENUM('mensal', 'anual', 'semestral', 'trimestral')`);
        
        // Create Seasons table with all current fields
        await queryRunner.query(`
            CREATE TABLE "Seasons" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "name" character varying(75) NOT NULL, 
                "seasonImage" text NOT NULL, 
                "description" character varying(1000) NOT NULL, 
                "startDate" TIMESTAMP WITH TIME ZONE NOT NULL, 
                "endDate" TIMESTAMP WITH TIME ZONE NOT NULL, 
                "status" "public"."Seasons_status_enum" NOT NULL DEFAULT 'agendado', 
                "inscriptionValue" numeric(10,2) NOT NULL, 
                "inscriptionType" "public"."Seasons_inscriptiontype_enum" NOT NULL, 
                "paymentMethods" text NOT NULL, 
                "championshipId" uuid NOT NULL, 
                CONSTRAINT "PK_Seasons" PRIMARY KEY ("id")
            )
        `);
        
        // Add foreign key constraint for championship
        await queryRunner.query(`
            ALTER TABLE "Seasons" 
            ADD CONSTRAINT "FK_Seasons_Championships_championshipId" 
            FOREIGN KEY ("championshipId") 
            REFERENCES "Championships"("id") 
            ON DELETE CASCADE 
            ON UPDATE NO ACTION
        `);
        
        // Create indexes for better query performance
        await queryRunner.query(`CREATE INDEX "IDX_Seasons_championshipId" ON "Seasons" ("championshipId")`);
        await queryRunner.query(`CREATE INDEX "IDX_Seasons_status" ON "Seasons" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_Seasons_startDate" ON "Seasons" ("startDate")`);
        await queryRunner.query(`CREATE INDEX "IDX_Seasons_endDate" ON "Seasons" ("endDate")`);
        await queryRunner.query(`CREATE INDEX "IDX_Seasons_inscriptionType" ON "Seasons" ("inscriptionType")`);
        await queryRunner.query(`CREATE INDEX "IDX_Seasons_name" ON "Seasons" ("name")`);
        
        // Create trigger for the Seasons table
        await queryRunner.query(`
            CREATE TRIGGER seasons_notify_trigger
            AFTER INSERT OR UPDATE OR DELETE ON "Seasons"
            FOR EACH ROW EXECUTE FUNCTION notify_database_events();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove trigger from Seasons table
        await queryRunner.query(`DROP TRIGGER IF EXISTS seasons_notify_trigger ON "Seasons"`);
        
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_Seasons_name"`);
        await queryRunner.query(`DROP INDEX "IDX_Seasons_inscriptionType"`);
        await queryRunner.query(`DROP INDEX "IDX_Seasons_endDate"`);
        await queryRunner.query(`DROP INDEX "IDX_Seasons_startDate"`);
        await queryRunner.query(`DROP INDEX "IDX_Seasons_status"`);
        await queryRunner.query(`DROP INDEX "IDX_Seasons_championshipId"`);
        
        // Drop the foreign key constraint
        await queryRunner.query(`ALTER TABLE "Seasons" DROP CONSTRAINT "FK_Seasons_Championships_championshipId"`);
        
        // Drop Seasons table
        await queryRunner.query(`DROP TABLE "Seasons"`);
        
        // Drop the enums
        await queryRunner.query(`DROP TYPE "public"."Seasons_inscriptiontype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."Seasons_status_enum"`);
    }
} 