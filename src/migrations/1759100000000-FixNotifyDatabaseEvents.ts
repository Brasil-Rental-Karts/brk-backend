import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixNotifyDatabaseEvents1759100000000
  implements MigrationInterface
{
  name = 'FixNotifyDatabaseEvents1759100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update the database events notification function to handle large payloads
    await queryRunner.query(`
            CREATE OR REPLACE FUNCTION notify_database_events() RETURNS TRIGGER AS $$
            DECLARE
                payload JSON;
                payload_text TEXT;
                max_length INTEGER := 7000; -- Leave some buffer for PostgreSQL limit
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
                
                -- Convert payload to text
                payload_text = payload::text;
                
                -- Check if payload is too large
                IF length(payload_text) > max_length THEN
                    -- Send a simplified notification without the full data
                    payload = json_build_object(
                        'operation', TG_OP,
                        'table', TG_TABLE_NAME,
                        'timestamp', EXTRACT(EPOCH FROM NOW()),
                        'data_size', length(payload_text),
                        'message', 'Payload too large for notification'
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to the original function
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
  }
}
