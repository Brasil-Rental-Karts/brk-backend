import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateNotificationFunctionName1748340702886 implements MigrationInterface {
    name = 'UpdateNotificationFunctionName1748340702886'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop existing triggers that use the old function name
        await queryRunner.query(`DROP TRIGGER IF EXISTS clubs_notify_trigger ON "Clubs"`);
        await queryRunner.query(`DROP TRIGGER IF EXISTS member_profiles_notify_trigger ON "MemberProfiles"`);
        
        // Drop the old function
        await queryRunner.query(`DROP FUNCTION IF EXISTS notify_rabbitmq()`);
        
        // Create the new database events notification function
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

        // Recreate triggers with the new function name
        await queryRunner.query(`
            CREATE TRIGGER clubs_notify_trigger
            AFTER INSERT OR UPDATE OR DELETE ON "Clubs"
            FOR EACH ROW EXECUTE FUNCTION notify_database_events();
        `);

        await queryRunner.query(`
            CREATE TRIGGER member_profiles_notify_trigger
            AFTER INSERT OR UPDATE OR DELETE ON "MemberProfiles"
            FOR EACH ROW EXECUTE FUNCTION notify_database_events();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop triggers that use the new function name
        await queryRunner.query(`DROP TRIGGER IF EXISTS clubs_notify_trigger ON "Clubs"`);
        await queryRunner.query(`DROP TRIGGER IF EXISTS member_profiles_notify_trigger ON "MemberProfiles"`);
        
        // Drop the new function
        await queryRunner.query(`DROP FUNCTION IF EXISTS notify_database_events()`);
        
        // Recreate the old function
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION notify_rabbitmq() RETURNS TRIGGER AS $$
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

        // Recreate triggers with the old function name
        await queryRunner.query(`
            CREATE TRIGGER clubs_notify_trigger
            AFTER INSERT OR UPDATE OR DELETE ON "Clubs"
            FOR EACH ROW EXECUTE FUNCTION notify_rabbitmq();
        `);

        await queryRunner.query(`
            CREATE TRIGGER member_profiles_notify_trigger
            AFTER INSERT OR UPDATE OR DELETE ON "MemberProfiles"
            FOR EACH ROW EXECUTE FUNCTION notify_rabbitmq();
        `);
    }
} 