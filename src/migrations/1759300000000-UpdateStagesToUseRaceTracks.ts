import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateStagesToUseRaceTracks1759300000000
  implements MigrationInterface
{
  name = 'UpdateStagesToUseRaceTracks1759300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Adicionar a coluna raceTrackId
    await queryRunner.query(`
      ALTER TABLE "Stages" 
      ADD COLUMN "raceTrackId" uuid
    `);

    // 2. Buscar o primeiro kartódromo cadastrado
    const firstRaceTrack = await queryRunner.query(`
      SELECT id FROM "RaceTracks" 
      ORDER BY "createdAt" ASC 
      LIMIT 1
    `);

    if (firstRaceTrack.length > 0) {
      const firstRaceTrackId = firstRaceTrack[0].id;

      // 3. Atualizar todas as etapas existentes para usar o primeiro kartódromo
      await queryRunner.query(
        `
        UPDATE "Stages" 
        SET "raceTrackId" = $1
        WHERE "raceTrackId" IS NULL
      `,
        [firstRaceTrackId]
      );

      // 4. Tornar a coluna raceTrackId obrigatória
      await queryRunner.query(`
        ALTER TABLE "Stages" 
        ALTER COLUMN "raceTrackId" SET NOT NULL
      `);

      // 5. Adicionar foreign key constraint
      await queryRunner.query(`
        ALTER TABLE "Stages" 
        ADD CONSTRAINT "FK_Stages_RaceTracks" 
        FOREIGN KEY ("raceTrackId") 
        REFERENCES "RaceTracks"("id") 
        ON DELETE RESTRICT
      `);
    }

    // 6. Remover as colunas antigas
    await queryRunner.query(`
      ALTER TABLE "Stages" 
      DROP COLUMN "kartodrome"
    `);

    await queryRunner.query(`
      ALTER TABLE "Stages" 
      DROP COLUMN "kartodromeAddress"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Adicionar de volta as colunas antigas
    await queryRunner.query(`
      ALTER TABLE "Stages" 
      ADD COLUMN "kartodrome" varchar(255) NOT NULL DEFAULT ''
    `);

    await queryRunner.query(`
      ALTER TABLE "Stages" 
      ADD COLUMN "kartodromeAddress" text NOT NULL DEFAULT ''
    `);

    // 2. Remover foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "Stages" 
      DROP CONSTRAINT "FK_Stages_RaceTracks"
    `);

    // 3. Remover a coluna raceTrackId
    await queryRunner.query(`
      ALTER TABLE "Stages" 
      DROP COLUMN "raceTrackId"
    `);
  }
}
