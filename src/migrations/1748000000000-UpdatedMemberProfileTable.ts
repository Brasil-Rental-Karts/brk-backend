import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatedMemberProfileTable1748000000000 implements MigrationInterface {
    name = 'UpdatedMemberProfileTable1748000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create MemberProfiles table with the specified fields using small numbers
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
                "nickName" VARCHAR(100) NOT NULL DEFAULT '',
                "birthDate" DATE,
                "gender" SMALLINT,
                "city" VARCHAR(100) NOT NULL DEFAULT '',
                "state" CHAR(2) NOT NULL DEFAULT '',
                "experienceTime" SMALLINT,
                "raceFrequency" SMALLINT,
                "championshipParticipation" SMALLINT,
                "competitiveLevel" SMALLINT,
                "hasOwnKart" BOOLEAN NOT NULL DEFAULT FALSE,
                "isTeamMember" BOOLEAN NOT NULL DEFAULT FALSE,
                "teamName" VARCHAR(100),
                "usesTelemetry" BOOLEAN NOT NULL DEFAULT FALSE,
                "telemetryType" VARCHAR(100),
                "attendsEvents" SMALLINT,
                "interestCategories" SMALLINT[],
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
            FOR EACH ROW EXECUTE FUNCTION notify_database_events();
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