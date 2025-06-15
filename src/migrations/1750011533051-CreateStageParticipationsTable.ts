import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStageParticipationsTable1750011533051 implements MigrationInterface {
    name = 'CreateStageParticipationsTable1750011533051'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create ParticipationStatus enum
        await queryRunner.query(`CREATE TYPE "public"."StageParticipations_status_enum" AS ENUM('confirmed', 'cancelled')`);
        
        // Create StageParticipations table
        await queryRunner.query(`
            CREATE TABLE "StageParticipations" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "userId" uuid NOT NULL, 
                "stageId" uuid NOT NULL, 
                "categoryId" uuid NOT NULL, 
                "status" "public"."StageParticipations_status_enum" NOT NULL DEFAULT 'confirmed', 
                "confirmedAt" TIMESTAMP WITH TIME ZONE, 
                "cancelledAt" TIMESTAMP WITH TIME ZONE, 
                "cancellationReason" character varying(255), 
                CONSTRAINT "PK_StageParticipations" PRIMARY KEY ("id")
            )
        `);
        
        // Add foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "StageParticipations" 
            ADD CONSTRAINT "FK_StageParticipations_Users_userId" 
            FOREIGN KEY ("userId") 
            REFERENCES "Users"("id") 
            ON DELETE CASCADE 
            ON UPDATE NO ACTION
        `);
        
        await queryRunner.query(`
            ALTER TABLE "StageParticipations" 
            ADD CONSTRAINT "FK_StageParticipations_Stages_stageId" 
            FOREIGN KEY ("stageId") 
            REFERENCES "Stages"("id") 
            ON DELETE CASCADE 
            ON UPDATE NO ACTION
        `);
        
        await queryRunner.query(`
            ALTER TABLE "StageParticipations" 
            ADD CONSTRAINT "FK_StageParticipations_Categories_categoryId" 
            FOREIGN KEY ("categoryId") 
            REFERENCES "Categories"("id") 
            ON DELETE CASCADE 
            ON UPDATE NO ACTION
        `);
        
        // Create unique index for user/stage/category combination
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_StageParticipations_userId_stageId_categoryId" 
            ON "StageParticipations" ("userId", "stageId", "categoryId")
        `);
        
        // Create indexes for better query performance
        await queryRunner.query(`CREATE INDEX "IDX_StageParticipations_userId" ON "StageParticipations" ("userId")`);
        await queryRunner.query(`CREATE INDEX "IDX_StageParticipations_stageId" ON "StageParticipations" ("stageId")`);
        await queryRunner.query(`CREATE INDEX "IDX_StageParticipations_categoryId" ON "StageParticipations" ("categoryId")`);
        await queryRunner.query(`CREATE INDEX "IDX_StageParticipations_status" ON "StageParticipations" ("status")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "public"."IDX_StageParticipations_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_StageParticipations_categoryId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_StageParticipations_stageId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_StageParticipations_userId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_StageParticipations_userId_stageId_categoryId"`);
        
        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "StageParticipations" DROP CONSTRAINT "FK_StageParticipations_Categories_categoryId"`);
        await queryRunner.query(`ALTER TABLE "StageParticipations" DROP CONSTRAINT "FK_StageParticipations_Stages_stageId"`);
        await queryRunner.query(`ALTER TABLE "StageParticipations" DROP CONSTRAINT "FK_StageParticipations_Users_userId"`);
        
        // Drop table
        await queryRunner.query(`DROP TABLE "StageParticipations"`);
        
        // Drop enum
        await queryRunner.query(`DROP TYPE "public"."StageParticipations_status_enum"`);
    }
} 