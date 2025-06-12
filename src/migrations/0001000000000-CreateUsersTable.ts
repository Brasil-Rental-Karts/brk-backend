import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUsersTable0001000000000 implements MigrationInterface {
    name = 'CreateUsersTable0001000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create extension for UUID generation if it doesn't exist
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        
        // Create user role enum with all roles
        await queryRunner.query(`CREATE TYPE "public"."Users_role_enum" AS ENUM('Member', 'Manager', 'Administrator')`);
        
        // Create Users table with all current fields
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
                "googleId" character varying(100),
                "profilePicture" character varying(255),
                "emailConfirmed" boolean NOT NULL DEFAULT false,
                "emailConfirmationToken" character varying(100),
                "emailConfirmationExpires" TIMESTAMP,
                CONSTRAINT "UQ_3c3ab3f49a87e6ddb607f3c4945" UNIQUE ("email"), 
                CONSTRAINT "PK_16d4f7d636df336db11d87413e3" PRIMARY KEY ("id")
            )
        `);

        // Create indexes for better performance
        await queryRunner.query(`CREATE INDEX "IDX_Users_email" ON "Users" ("email")`);
        await queryRunner.query(`CREATE INDEX "IDX_Users_googleId" ON "Users" ("googleId")`);
        await queryRunner.query(`CREATE INDEX "IDX_Users_role" ON "Users" ("role")`);
        await queryRunner.query(`CREATE INDEX "IDX_Users_active" ON "Users" ("active")`);
        await queryRunner.query(`CREATE INDEX "IDX_Users_emailConfirmed" ON "Users" ("emailConfirmed")`);
        
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

        // Create trigger for the Users table
        await queryRunner.query(`
            CREATE TRIGGER users_notify_trigger
            AFTER INSERT OR UPDATE OR DELETE ON "Users"
            FOR EACH ROW EXECUTE FUNCTION notify_database_events();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop trigger from Users table
        await queryRunner.query(`DROP TRIGGER IF EXISTS users_notify_trigger ON "Users"`);
        
        // Drop the notification function
        await queryRunner.query(`DROP FUNCTION IF EXISTS notify_database_events()`);
        
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_Users_emailConfirmed"`);
        await queryRunner.query(`DROP INDEX "IDX_Users_active"`);
        await queryRunner.query(`DROP INDEX "IDX_Users_role"`);
        await queryRunner.query(`DROP INDEX "IDX_Users_googleId"`);
        await queryRunner.query(`DROP INDEX "IDX_Users_email"`);
        
        // Drop table
        await queryRunner.query(`DROP TABLE "Users"`);
        
        // Drop the role enum
        await queryRunner.query(`DROP TYPE "public"."Users_role_enum"`);
    }
} 