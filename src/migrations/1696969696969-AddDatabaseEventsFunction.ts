import { MigrationInterface, QueryRunner } from 'typeorm';
import { rabbitMQConfig } from '../config/rabbitmq.config';

export class AddDatabaseEventsFunction1696969696969 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the notify_rabbitmq function that will be called by triggers
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

    // Create trigger for the Clubs table
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS clubs_notify_trigger ON "Clubs";
      CREATE TRIGGER clubs_notify_trigger
      AFTER INSERT OR UPDATE OR DELETE ON "Clubs"
      FOR EACH ROW EXECUTE FUNCTION notify_rabbitmq();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove trigger from Clubs table
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS clubs_notify_trigger ON "Clubs";
    `);

    // Drop the function
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS notify_rabbitmq();
    `);
  }
} 