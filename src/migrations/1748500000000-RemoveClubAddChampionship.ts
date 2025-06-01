import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveClubAddChampionship1748500000000 implements MigrationInterface {
    name = 'RemoveClubAddChampionship1748500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Remove trigger from Clubs table
        await queryRunner.query(`DROP TRIGGER IF EXISTS clubs_notify_trigger ON "Clubs"`);
        
        // Drop the Clubs table
        await queryRunner.query(`DROP TABLE IF EXISTS "Clubs"`);
        
        // Create PersonType enum
        await queryRunner.query(`CREATE TYPE "public"."Championships_persontype_enum" AS ENUM('0', '1')`);
        
        // Create Championships table
        await queryRunner.query(`
            CREATE TABLE "Championships" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "name" character varying(90) NOT NULL, 
                "shortDescription" character varying(165), 
                "fullDescription" text, 
                "personType" "public"."Championships_persontype_enum" NOT NULL DEFAULT '0', 
                "document" character varying(18) NOT NULL, 
                "socialReason" character varying(255), 
                "cep" character varying(9) NOT NULL, 
                "state" character varying(2) NOT NULL, 
                "city" character varying(100) NOT NULL, 
                "fullAddress" text NOT NULL, 
                "number" character varying(10) NOT NULL, 
                "complement" character varying(100), 
                "isResponsible" boolean NOT NULL DEFAULT true, 
                "responsibleName" character varying(100), 
                "responsiblePhone" character varying(15), 
                "ownerId" uuid NOT NULL, 
                CONSTRAINT "PK_Championships" PRIMARY KEY ("id")
            )
        `);
        
        // Add foreign key constraint for championship owner
        await queryRunner.query(`
            ALTER TABLE "Championships" 
            ADD CONSTRAINT "FK_Championships_Users_ownerId" 
            FOREIGN KEY ("ownerId") 
            REFERENCES "Users"("id") 
            ON DELETE CASCADE 
            ON UPDATE NO ACTION
        `);
        
        // Create trigger for the Championships table
        await queryRunner.query(`
            CREATE TRIGGER championships_notify_trigger
            AFTER INSERT OR UPDATE OR DELETE ON "Championships"
            FOR EACH ROW EXECUTE FUNCTION notify_database_events();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove trigger from Championships table
        await queryRunner.query(`DROP TRIGGER IF EXISTS championships_notify_trigger ON "Championships"`);
        
        // Drop the foreign key constraint
        await queryRunner.query(`ALTER TABLE "Championships" DROP CONSTRAINT "FK_Championships_Users_ownerId"`);
        
        // Drop Championships table
        await queryRunner.query(`DROP TABLE "Championships"`);
        
        // Drop the PersonType enum
        await queryRunner.query(`DROP TYPE "public"."Championships_persontype_enum"`);
        
        // Recreate Clubs table
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
        
        // Create trigger for the Clubs table
        await queryRunner.query(`
            CREATE TRIGGER clubs_notify_trigger
            AFTER INSERT OR UPDATE OR DELETE ON "Clubs"
            FOR EACH ROW EXECUTE FUNCTION notify_database_events();
        `);
    }
} 