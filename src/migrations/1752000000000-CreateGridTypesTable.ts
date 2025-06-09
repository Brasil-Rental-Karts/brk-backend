import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateGridTypesTable1752000000000 implements MigrationInterface {
    name = 'CreateGridTypesTable1752000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create GridTypes table
        await queryRunner.query(`
            CREATE TABLE "GridTypes" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "name" character varying(100) NOT NULL, 
                "description" text NOT NULL, 
                "type" character varying NOT NULL CHECK ("type" IN ('super_pole', 'inverted', 'inverted_partial')), 
                "isActive" boolean NOT NULL DEFAULT true, 
                "isDefault" boolean NOT NULL DEFAULT false, 
                "invertedPositions" integer, 
                "championshipId" uuid NOT NULL, 
                CONSTRAINT "PK_GridTypes" PRIMARY KEY ("id")
            )
        `);
        
        // Add foreign key constraint to Championships
        await queryRunner.query(`
            ALTER TABLE "GridTypes" 
            ADD CONSTRAINT "FK_GridTypes_championshipId" 
            FOREIGN KEY ("championshipId") REFERENCES "Championships"("id") ON DELETE CASCADE
        `);
        
        // Add unique constraint for championship + name
        await queryRunner.query(`
            ALTER TABLE "GridTypes" 
            ADD CONSTRAINT "UQ_GridTypes_championship_name" 
            UNIQUE ("championshipId", "name")
        `);
        
        // Create indexes for better query performance
        await queryRunner.query(`CREATE INDEX "IDX_GridTypes_championshipId" ON "GridTypes" ("championshipId")`);
        await queryRunner.query(`CREATE INDEX "IDX_GridTypes_type" ON "GridTypes" ("type")`);
        await queryRunner.query(`CREATE INDEX "IDX_GridTypes_isActive" ON "GridTypes" ("isActive")`);
        await queryRunner.query(`CREATE INDEX "IDX_GridTypes_isDefault" ON "GridTypes" ("isDefault")`);
        
        // Create trigger for the GridTypes table
        await queryRunner.query(`
            CREATE TRIGGER grid_types_notify_trigger
            AFTER INSERT OR UPDATE OR DELETE ON "GridTypes"
            FOR EACH ROW EXECUTE FUNCTION notify_database_events();
        `);

        // Insert default grid types for existing championships
        await queryRunner.query(`
            INSERT INTO "GridTypes" ("name", "description", "type", "isActive", "isDefault", "championshipId", "createdAt", "updatedAt")
            SELECT 
                'Super Pole' as "name",
                'A volta mais rápida da classificação define a ordem de largada' as "description",
                'super_pole' as "type",
                true as "isActive",
                true as "isDefault",
                c."id" as "championshipId",
                NOW() as "createdAt",
                NOW() as "updatedAt"
            FROM "Championships" c
        `);

        await queryRunner.query(`
            INSERT INTO "GridTypes" ("name", "description", "type", "isActive", "isDefault", "championshipId", "createdAt", "updatedAt")
            SELECT 
                'Invertido' as "name",
                'Posições de largada são definidas pelo resultado da bateria anterior de forma invertida' as "description",
                'inverted' as "type",
                true as "isActive",
                false as "isDefault",
                c."id" as "championshipId",
                NOW() as "createdAt",
                NOW() as "updatedAt"
            FROM "Championships" c
        `);

        await queryRunner.query(`
            INSERT INTO "GridTypes" ("name", "description", "type", "isActive", "isDefault", "invertedPositions", "championshipId", "createdAt", "updatedAt")
            SELECT 
                'Invertido + 10' as "name",
                'Somente os 10 primeiros colocados da bateria anterior invertem suas posições' as "description",
                'inverted_partial' as "type",
                true as "isActive",
                false as "isDefault",
                10 as "invertedPositions",
                c."id" as "championshipId",
                NOW() as "createdAt",
                NOW() as "updatedAt"
            FROM "Championships" c
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove trigger from GridTypes table
        await queryRunner.query(`DROP TRIGGER IF EXISTS grid_types_notify_trigger ON "GridTypes"`);
        
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_GridTypes_isDefault"`);
        await queryRunner.query(`DROP INDEX "IDX_GridTypes_isActive"`);
        await queryRunner.query(`DROP INDEX "IDX_GridTypes_type"`);
        await queryRunner.query(`DROP INDEX "IDX_GridTypes_championshipId"`);
        
        // Drop constraints
        await queryRunner.query(`ALTER TABLE "GridTypes" DROP CONSTRAINT "UQ_GridTypes_championship_name"`);
        await queryRunner.query(`ALTER TABLE "GridTypes" DROP CONSTRAINT "FK_GridTypes_championshipId"`);
        
        // Drop GridTypes table
        await queryRunner.query(`DROP TABLE "GridTypes"`);
    }
} 