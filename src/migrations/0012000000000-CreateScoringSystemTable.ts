import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateScoringSystemTable0012000000000 implements MigrationInterface {
    name = 'CreateScoringSystemTable0012000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create ScoringSystem table
        await queryRunner.query(`
            CREATE TABLE "ScoringSystem" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "name" character varying(100) NOT NULL, 
                "description" text, 
                "positions" jsonb NOT NULL, 
                "polePositionPoints" numeric(5,2) NOT NULL DEFAULT '0', 
                "fastestLapPoints" numeric(5,2) NOT NULL DEFAULT '0', 
                "leaderLapPoints" numeric(5,2) NOT NULL DEFAULT '0', 
                "isActive" boolean NOT NULL DEFAULT true, 
                "isDefault" boolean NOT NULL DEFAULT false, 
                "championshipId" uuid NOT NULL, 
                CONSTRAINT "PK_ScoringSystem" PRIMARY KEY ("id")
            )
        `);
        
        // Add foreign key constraint for championship
        await queryRunner.query(`
            ALTER TABLE "ScoringSystem" 
            ADD CONSTRAINT "FK_ScoringSystem_Championships_championshipId" 
            FOREIGN KEY ("championshipId") 
            REFERENCES "Championships"("id") 
            ON DELETE CASCADE 
            ON UPDATE NO ACTION
        `);

        // Create indexes for better performance
        await queryRunner.query(`CREATE INDEX "IDX_ScoringSystem_championshipId" ON "ScoringSystem" ("championshipId")`);
        await queryRunner.query(`CREATE INDEX "IDX_ScoringSystem_name" ON "ScoringSystem" ("name")`);
        await queryRunner.query(`CREATE INDEX "IDX_ScoringSystem_isActive" ON "ScoringSystem" ("isActive")`);
        await queryRunner.query(`CREATE INDEX "IDX_ScoringSystem_isDefault" ON "ScoringSystem" ("isDefault")`);
        
        // Create trigger for the ScoringSystem table
        await queryRunner.query(`
            CREATE TRIGGER scoring_system_notify_trigger
            AFTER INSERT OR UPDATE OR DELETE ON "ScoringSystem"
            FOR EACH ROW EXECUTE FUNCTION notify_database_events();
        `);

        // Insert default scoring systems examples
        await queryRunner.query(`
            INSERT INTO "ScoringSystem" (
                "name", 
                "description", 
                "positions", 
                "polePositionPoints", 
                "fastestLapPoints", 
                "leaderLapPoints", 
                "isActive", 
                "isDefault", 
                "championshipId"
            ) 
            SELECT 
                'Fórmula 1 (Padrão)', 
                'Sistema de pontuação baseado na Fórmula 1: 25-18-15-12-10-8-6-4-2-1 pontos para os 10 primeiros colocados, com 1 ponto adicional para pole position e volta mais rápida',
                '[
                    {"position": 1, "points": 25},
                    {"position": 2, "points": 18},
                    {"position": 3, "points": 15},
                    {"position": 4, "points": 12},
                    {"position": 5, "points": 10},
                    {"position": 6, "points": 8},
                    {"position": 7, "points": 6},
                    {"position": 8, "points": 4},
                    {"position": 9, "points": 2},
                    {"position": 10, "points": 1}
                ]'::jsonb,
                1,
                1,
                0,
                true,
                true,
                c.id
            FROM "Championships" c 
            LIMIT 1
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove trigger from ScoringSystem table
        await queryRunner.query(`DROP TRIGGER IF EXISTS scoring_system_notify_trigger ON "ScoringSystem"`);
        
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_ScoringSystem_isDefault"`);
        await queryRunner.query(`DROP INDEX "IDX_ScoringSystem_isActive"`);
        await queryRunner.query(`DROP INDEX "IDX_ScoringSystem_name"`);
        await queryRunner.query(`DROP INDEX "IDX_ScoringSystem_championshipId"`);
        
        // Drop the foreign key constraint
        await queryRunner.query(`ALTER TABLE "ScoringSystem" DROP CONSTRAINT "FK_ScoringSystem_Championships_championshipId"`);
        
        // Drop ScoringSystem table
        await queryRunner.query(`DROP TABLE "ScoringSystem"`);
    }
} 