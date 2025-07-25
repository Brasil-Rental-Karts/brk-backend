import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeStageNotifications1759500000000
  implements MigrationInterface
{
  name = 'OptimizeStageNotifications1759500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update the database events notification function to handle large payloads more efficiently
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
                
                -- Check if payload is too large (especially for Stages table)
                IF length(payload_text) > max_length THEN
                    -- For Stages table, send only the ID and operation
                    IF TG_TABLE_NAME = 'Stages' THEN
                        IF (TG_OP = 'DELETE') THEN
                            payload = json_build_object(
                                'operation', TG_OP,
                                'table', TG_TABLE_NAME,
                                'timestamp', EXTRACT(EPOCH FROM NOW()),
                                'data', json_build_object('id', OLD.id, 'seasonId', OLD."seasonId"),
                                'large_payload', true
                            );
                        ELSE
                            payload = json_build_object(
                                'operation', TG_OP,
                                'table', TG_TABLE_NAME,
                                'timestamp', EXTRACT(EPOCH FROM NOW()),
                                'data', json_build_object('id', NEW.id, 'seasonId', NEW."seasonId"),
                                'large_payload', true
                            );
                        END IF;
                    ELSE
                        -- For other tables, send a simplified notification
                        payload = json_build_object(
                            'operation', TG_OP,
                            'table', TG_TABLE_NAME,
                            'timestamp', EXTRACT(EPOCH FROM NOW()),
                            'data_size', length(payload_text),
                            'message', 'Payload too large for notification'
                        );
                    END IF;
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
    // Revert to the previous function
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
}
