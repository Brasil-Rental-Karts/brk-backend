import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSeasonRegistrationStagesTable1751000000001 implements MigrationInterface {
    name = 'CreateSeasonRegistrationStagesTable1751000000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create SeasonRegistrationStages table
        await queryRunner.query(`
            CREATE TABLE "SeasonRegistrationStages" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "registrationId" uuid NOT NULL, 
                "stageId" uuid NOT NULL, 
                CONSTRAINT "PK_SeasonRegistrationStages" PRIMARY KEY ("id")
            )
        `);
        
        // Add foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "SeasonRegistrationStages" 
            ADD CONSTRAINT "FK_SeasonRegistrationStages_SeasonRegistrations_registrationId" 
            FOREIGN KEY ("registrationId") 
            REFERENCES "SeasonRegistrations"("id") 
            ON DELETE CASCADE 
            ON UPDATE NO ACTION
        `);
        
        await queryRunner.query(`
            ALTER TABLE "SeasonRegistrationStages" 
            ADD CONSTRAINT "FK_SeasonRegistrationStages_Stages_stageId" 
            FOREIGN KEY ("stageId") 
            REFERENCES "Stages"("id") 
            ON DELETE CASCADE 
            ON UPDATE NO ACTION
        `);
        
        // Create unique index for registration/stage combination
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_SeasonRegistrationStages_registrationId_stageId" 
            ON "SeasonRegistrationStages" ("registrationId", "stageId")
        `);
        
        // Create indexes for better query performance
        await queryRunner.query(`CREATE INDEX "IDX_SeasonRegistrationStages_registrationId" ON "SeasonRegistrationStages" ("registrationId")`);
        await queryRunner.query(`CREATE INDEX "IDX_SeasonRegistrationStages_stageId" ON "SeasonRegistrationStages" ("stageId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_SeasonRegistrationStages_stageId"`);
        await queryRunner.query(`DROP INDEX "IDX_SeasonRegistrationStages_registrationId"`);
        await queryRunner.query(`DROP INDEX "IDX_SeasonRegistrationStages_registrationId_stageId"`);
        
        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "SeasonRegistrationStages" DROP CONSTRAINT "FK_SeasonRegistrationStages_Stages_stageId"`);
        await queryRunner.query(`ALTER TABLE "SeasonRegistrationStages" DROP CONSTRAINT "FK_SeasonRegistrationStages_SeasonRegistrations_registrationId"`);
        
        // Drop table
        await queryRunner.query(`DROP TABLE "SeasonRegistrationStages"`);
    }
} 