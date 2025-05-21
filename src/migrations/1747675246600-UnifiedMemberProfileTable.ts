import { MigrationInterface, QueryRunner } from "typeorm";

export class UnifiedMemberProfileTable1747675246600 implements MigrationInterface {
    name = 'UnifiedMemberProfileTable1747675246600'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create MemberProfiles table with all fields using camelCase
        await queryRunner.query(`
            CREATE TABLE "MemberProfiles" (
                "id" uuid NOT NULL, 
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "lastLoginAt" TIMESTAMP,
                "nickName" VARCHAR(100) NOT NULL DEFAULT '',
                "birthDate" DATE NOT NULL DEFAULT NOW(),
                "gender" VARCHAR(20) NOT NULL DEFAULT '',
                "city" VARCHAR(100) NOT NULL DEFAULT '',
                "state" CHAR(2) NOT NULL DEFAULT '',
                "experienceTime" VARCHAR(20) NOT NULL DEFAULT '',
                "raceFrequency" VARCHAR(20) NOT NULL DEFAULT '',
                "championshipParticipation" VARCHAR(20) NOT NULL DEFAULT '',
                "competitiveLevel" VARCHAR(20) NOT NULL DEFAULT '',
                "hasOwnKart" BOOLEAN NOT NULL DEFAULT FALSE,
                "isTeamMember" BOOLEAN NOT NULL DEFAULT FALSE,
                "teamName" VARCHAR(100),
                "usesTelemetry" BOOLEAN NOT NULL DEFAULT FALSE,
                "telemetryType" VARCHAR(100),
                "attendsEvents" VARCHAR(20) NOT NULL DEFAULT '',
                "interestCategories" TEXT[] NOT NULL DEFAULT '{}',
                "preferredTrack" VARCHAR(100),
                CONSTRAINT "PK_MemberProfiles" PRIMARY KEY ("id")
            )
        `);
        
        // Add foreign key constraint to link profile to user
        await queryRunner.query(`
            ALTER TABLE "MemberProfiles"
            ADD CONSTRAINT "FK_MemberProfiles_Users_id"
            FOREIGN KEY ("id")
            REFERENCES "Users"("id")
            ON DELETE CASCADE
            ON UPDATE NO ACTION
        `);
        
        // Create trigger for the MemberProfiles table
        await queryRunner.query(`
            CREATE TRIGGER member_profiles_notify_trigger
            AFTER INSERT OR UPDATE OR DELETE ON "MemberProfiles"
            FOR EACH ROW EXECUTE FUNCTION notify_rabbitmq();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop trigger from MemberProfiles table
        await queryRunner.query(`DROP TRIGGER IF EXISTS member_profiles_notify_trigger ON "MemberProfiles"`);
        
        // Drop the foreign key constraint
        await queryRunner.query(`ALTER TABLE "MemberProfiles" DROP CONSTRAINT "FK_MemberProfiles_Users_id"`);
        
        // Drop the MemberProfiles table
        await queryRunner.query(`DROP TABLE "MemberProfiles"`);
    }
} 