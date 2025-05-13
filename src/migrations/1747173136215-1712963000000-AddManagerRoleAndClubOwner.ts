import { MigrationInterface, QueryRunner } from "typeorm";

export class AddManagerRoleAndClubOwner1747173136215 implements MigrationInterface {
    name = 'AddManagerRoleAndClubOwner1747173136215'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if the Manager role already exists before adding it
        const checkRoleQuery = await queryRunner.query(`
            SELECT 1 FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            WHERE t.typname = 'users_role_enum' AND e.enumlabel = 'Manager'
        `);
        
        if (checkRoleQuery.length === 0) {
            // Add Manager to role enum only if it doesn't exist
            await queryRunner.query(`ALTER TYPE "public"."Users_role_enum" ADD VALUE 'Manager'`);
        }
        
        // Check if ownerId column exists
        const checkColumnQuery = await queryRunner.query(`
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'Clubs' AND column_name = 'ownerId'
        `);
        
        if (checkColumnQuery.length === 0) {
            // Add ownerId column to Clubs table if it doesn't exist
            await queryRunner.query(`ALTER TABLE "Clubs" ADD COLUMN "ownerId" uuid`);
        }
        
        // Check if foreign key constraint exists
        const checkConstraintQuery = await queryRunner.query(`
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'FK_Clubs_Users_ownerId' AND table_name = 'Clubs'
        `);
        
        if (checkConstraintQuery.length === 0) {
            // Add foreign key constraint if it doesn't exist
            await queryRunner.query(`
                ALTER TABLE "Clubs" 
                ADD CONSTRAINT "FK_Clubs_Users_ownerId" 
                FOREIGN KEY ("ownerId") 
                REFERENCES "Users"("id") 
                ON DELETE SET NULL 
                ON UPDATE NO ACTION
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Check if constraint exists before removing
        const checkConstraintQuery = await queryRunner.query(`
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'FK_Clubs_Users_ownerId' AND table_name = 'Clubs'
        `);
        
        if (checkConstraintQuery.length > 0) {
            // Remove foreign key constraint if it exists
            await queryRunner.query(`ALTER TABLE "Clubs" DROP CONSTRAINT "FK_Clubs_Users_ownerId"`);
        }
        
        // Check if column exists before removing
        const checkColumnQuery = await queryRunner.query(`
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'Clubs' AND column_name = 'ownerId'
        `);
        
        if (checkColumnQuery.length > 0) {
            // Remove ownerId column if it exists
            await queryRunner.query(`ALTER TABLE "Clubs" DROP COLUMN "ownerId"`);
        }
        
        // We cannot easily remove values from an enum type in PostgreSQL
        // A workaround would be to create a new enum, but that's complex for rollback
        // So we'll leave the Manager value in the enum type
    }
}
