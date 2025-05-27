import { MigrationInterface, QueryRunner } from "typeorm";

export class UnifiedMigration1000000000000 implements MigrationInterface {
    name = 'UnifiedMigration1000000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create extension for UUID generation if it doesn't exist
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        
        // Create user role enum with all roles (including Manager)
        await queryRunner.query(`CREATE TYPE "public"."Users_role_enum" AS ENUM('Member', 'Manager', 'Administrator')`);
        
        // Create Users table
        await queryRunner.query(`
            CREATE TABLE "Users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "name" character varying(100) NOT NULL, 
                "email" character varying(100) NOT NULL, 
                "phone" character varying(20), 
                "password" character varying(100) NOT NULL, 
                "role" "public"."Users_role_enum" NOT NULL DEFAULT 'Member', 
                "registrationDate" date NOT NULL, 
                "active" boolean NOT NULL DEFAULT true, 
                "resetPasswordToken" character varying(100),
                "resetPasswordExpires" TIMESTAMP,
                CONSTRAINT "UQ_3c3ab3f49a87e6ddb607f3c4945" UNIQUE ("email"), 
                CONSTRAINT "PK_16d4f7d636df336db11d87413e3" PRIMARY KEY ("id")
            )
        `);
        
        // Create Clubs table with ownerId column
        await queryRunner.query(`
            CREATE TABLE "Clubs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "name" character varying(100) NOT NULL, 
                "foundationDate" date, 
                "description" text, 
                "logoUrl" character varying(255),
                "ownerId" uuid,
                CONSTRAINT "PK_174e8f05d412f7c978e45a3350e" PRIMARY KEY ("id")
            )
        `);
        
        // Add foreign key constraint for club owner
        await queryRunner.query(`
            ALTER TABLE "Clubs" 
            ADD CONSTRAINT "FK_Clubs_Users_ownerId" 
            FOREIGN KEY ("ownerId") 
            REFERENCES "Users"("id") 
            ON DELETE SET NULL 
            ON UPDATE NO ACTION
        `);
        
        // Create the database events notification function
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION notify_database_events() RETURNS TRIGGER AS $$
            DECLARE
                payload JSON;
            BEGIN
                -- Create a JSON payload for the notification
                IF (TG_OP = 'DELETE') THEN
                    payload = json_build_object(
                        'operation', TG_OP,
                        'table', TG_TABLE_NAME,
                        'timestamp', EXTRACT(EPOCH FROM NOW()),
                        'data', row_to_json(OLD)
                    );
                ELSE
                    payload = json_build_object(
                        'operation', TG_OP,
                        'table', TG_TABLE_NAME,
                        'timestamp', EXTRACT(EPOCH FROM NOW()),
                        'data', row_to_json(NEW)
                    );
                END IF;
                
                -- Send the notification
                PERFORM pg_notify('database_events', payload::text);
                
                -- Return the appropriate record
                IF (TG_OP = 'DELETE') THEN
                    RETURN OLD;
                ELSE
                    RETURN NEW;
                END IF;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Create trigger for the Clubs table
        await queryRunner.query(`
            CREATE TRIGGER clubs_notify_trigger
            AFTER INSERT OR UPDATE OR DELETE ON "Clubs"
            FOR EACH ROW EXECUTE FUNCTION notify_database_events();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop trigger from Clubs table
        await queryRunner.query(`DROP TRIGGER IF EXISTS clubs_notify_trigger ON "Clubs"`);
        
        // Drop the notification function
        await queryRunner.query(`DROP FUNCTION IF EXISTS notify_database_events()`);
        
        // Drop the foreign key constraint
        await queryRunner.query(`ALTER TABLE "Clubs" DROP CONSTRAINT "FK_Clubs_Users_ownerId"`);
        
        // Drop tables
        await queryRunner.query(`DROP TABLE "Clubs"`);
        await queryRunner.query(`DROP TABLE "Users"`);
        
        // Drop the role enum
        await queryRunner.query(`DROP TYPE "public"."Users_role_enum"`);
    }
} 