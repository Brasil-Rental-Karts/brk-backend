import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChampionshipClassificationTable1762000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ChampionshipClassification" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "categoryId" uuid NOT NULL,
        "seasonId" uuid NOT NULL,
        "championshipId" uuid NOT NULL,
        "totalPoints" integer NOT NULL DEFAULT 0,
        "totalStages" integer NOT NULL DEFAULT 0,
        "wins" integer NOT NULL DEFAULT 0,
        "podiums" integer NOT NULL DEFAULT 0,
        "polePositions" integer NOT NULL DEFAULT 0,
        "fastestLaps" integer NOT NULL DEFAULT 0,
        "bestPosition" integer,
        "averagePosition" decimal(5,2),
        "lastCalculatedAt" timestamp with time zone NOT NULL DEFAULT now(),
        "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
        "updatedAt" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ChampionshipClassification" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ChampionshipClassification_User" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ChampionshipClassification_Category" FOREIGN KEY ("categoryId") REFERENCES "Categories"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ChampionshipClassification_Season" FOREIGN KEY ("seasonId") REFERENCES "Seasons"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ChampionshipClassification_Championship" FOREIGN KEY ("championshipId") REFERENCES "Championships"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_ChampionshipClassification_User_Category_Season" UNIQUE ("userId", "categoryId", "seasonId")
      )
    `);

    // Criar índices para otimizar as consultas
    await queryRunner.query(`
      CREATE INDEX "IDX_ChampionshipClassification_Season_Category" ON "ChampionshipClassification" ("seasonId", "categoryId")
    `);
    
    await queryRunner.query(`
      CREATE INDEX "IDX_ChampionshipClassification_Championship_Category" ON "ChampionshipClassification" ("championshipId", "categoryId")
    `);
    
    await queryRunner.query(`
      CREATE INDEX "IDX_ChampionshipClassification_User_Championship" ON "ChampionshipClassification" ("userId", "championshipId")
    `);
    
    await queryRunner.query(`
      CREATE INDEX "IDX_ChampionshipClassification_TotalPoints" ON "ChampionshipClassification" ("totalPoints" DESC)
    `);

    // Create trigger for database events (following the pattern from other migrations)
    await queryRunner.query(`
      CREATE TRIGGER championship_classification_notify_trigger
      AFTER INSERT OR UPDATE OR DELETE ON "ChampionshipClassification"
      FOR EACH ROW EXECUTE FUNCTION notify_database_events();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS championship_classification_notify_trigger ON "ChampionshipClassification"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ChampionshipClassification_TotalPoints"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ChampionshipClassification_User_Championship"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ChampionshipClassification_Championship_Category"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ChampionshipClassification_Season_Category"`);
    await queryRunner.query(`DROP TABLE "ChampionshipClassification"`);
  }
} 