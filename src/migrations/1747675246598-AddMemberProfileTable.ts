import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMemberProfileTable1747675246598 implements MigrationInterface {
    name = 'AddMemberProfileTable1747675246598'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create MemberProfiles table with ID that matches the User ID
        await queryRunner.query(`
            CREATE TABLE "MemberProfiles" (
                "id" uuid NOT NULL, 
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "nickname" character varying(50),
                "birthday" date,
                "lastLoginAt" TIMESTAMP,
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