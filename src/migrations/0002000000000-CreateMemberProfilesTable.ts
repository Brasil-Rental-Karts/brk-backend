import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMemberProfilesTable0002000000000 implements MigrationInterface {
    name = 'CreateMemberProfilesTable0002000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create MemberProfiles table with all current fields
        // Field descriptions:
        // gender: 0=Male, 1=Female, 2=Other, 3=PreferNotToSay
        // experienceTime: 0=Never, 1=LessThanOneYear, 2=OneToTwoYears, 3=ThreeToFiveYears, 4=MoreThanFiveYears
        // raceFrequency: 0=Rarely, 1=Regularly, 2=Weekly, 3=Daily
        // championshipParticipation: 0=Never, 1=LocalRegional, 2=State, 3=National
        // competitiveLevel: 0=Beginner, 1=Intermediate, 2=Competitive, 3=Professional
        // attendsEvents: 0=Yes, 1=No, 2=DependsOnDistance
        // interestCategories: Array of: 0=LightRentalKart, 1=HeavyRentalKart, 2=TwoStrokeKart, 3=Endurance, 4=Teams, 5=LongChampionships, 6=SingleRaces
        await queryRunner.query(`
            CREATE TABLE "MemberProfiles" (
                "id" uuid NOT NULL, 
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "lastLoginAt" TIMESTAMP NOT NULL DEFAULT now(),
                "nickName" character varying(100) NOT NULL DEFAULT '',
                "birthDate" date,
                "gender" smallint,
                "city" character varying(100) NOT NULL DEFAULT '',
                "state" character varying(2) NOT NULL DEFAULT '',
                "experienceTime" smallint,
                "raceFrequency" smallint,
                "championshipParticipation" smallint,
                "competitiveLevel" smallint,
                "hasOwnKart" boolean NOT NULL DEFAULT false,
                "isTeamMember" boolean NOT NULL DEFAULT false,
                "teamName" character varying(100),
                "usesTelemetry" boolean NOT NULL DEFAULT false,
                "telemetryType" character varying(100),
                "attendsEvents" smallint,
                "interestCategories" smallint[],
                "preferredTrack" character varying(100),
                CONSTRAINT "PK_MemberProfiles" PRIMARY KEY ("id")
            )
        `);
        
        // Add foreign key constraint to link profile to user (1:1 relationship)
        await queryRunner.query(`
            ALTER TABLE "MemberProfiles"
            ADD CONSTRAINT "FK_MemberProfiles_Users_id"
            FOREIGN KEY ("id")
            REFERENCES "Users"("id")
            ON DELETE CASCADE
            ON UPDATE NO ACTION
        `);

        // Create indexes for better performance
        await queryRunner.query(`CREATE INDEX "IDX_MemberProfiles_nickName" ON "MemberProfiles" ("nickName")`);
        await queryRunner.query(`CREATE INDEX "IDX_MemberProfiles_city" ON "MemberProfiles" ("city")`);
        await queryRunner.query(`CREATE INDEX "IDX_MemberProfiles_state" ON "MemberProfiles" ("state")`);
        await queryRunner.query(`CREATE INDEX "IDX_MemberProfiles_gender" ON "MemberProfiles" ("gender")`);
        await queryRunner.query(`CREATE INDEX "IDX_MemberProfiles_experienceTime" ON "MemberProfiles" ("experienceTime")`);
        await queryRunner.query(`CREATE INDEX "IDX_MemberProfiles_competitiveLevel" ON "MemberProfiles" ("competitiveLevel")`);
        await queryRunner.query(`CREATE INDEX "IDX_MemberProfiles_hasOwnKart" ON "MemberProfiles" ("hasOwnKart")`);
        await queryRunner.query(`CREATE INDEX "IDX_MemberProfiles_isTeamMember" ON "MemberProfiles" ("isTeamMember")`);
        
        // Create trigger for the MemberProfiles table
        await queryRunner.query(`
            CREATE TRIGGER member_profiles_notify_trigger
            AFTER INSERT OR UPDATE OR DELETE ON "MemberProfiles"
            FOR EACH ROW EXECUTE FUNCTION notify_database_events();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop trigger from MemberProfiles table
        await queryRunner.query(`DROP TRIGGER IF EXISTS member_profiles_notify_trigger ON "MemberProfiles"`);
        
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_MemberProfiles_isTeamMember"`);
        await queryRunner.query(`DROP INDEX "IDX_MemberProfiles_hasOwnKart"`);
        await queryRunner.query(`DROP INDEX "IDX_MemberProfiles_competitiveLevel"`);
        await queryRunner.query(`DROP INDEX "IDX_MemberProfiles_experienceTime"`);
        await queryRunner.query(`DROP INDEX "IDX_MemberProfiles_gender"`);
        await queryRunner.query(`DROP INDEX "IDX_MemberProfiles_state"`);
        await queryRunner.query(`DROP INDEX "IDX_MemberProfiles_city"`);
        await queryRunner.query(`DROP INDEX "IDX_MemberProfiles_nickName"`);
        
        // Drop the foreign key constraint
        await queryRunner.query(`ALTER TABLE "MemberProfiles" DROP CONSTRAINT "FK_MemberProfiles_Users_id"`);
        
        // Drop the MemberProfiles table
        await queryRunner.query(`DROP TABLE "MemberProfiles"`);
    }
} 