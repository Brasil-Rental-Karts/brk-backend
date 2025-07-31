import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertSeasonIdToUuid1772000000000 implements MigrationInterface {
  name = 'ConvertSeasonIdToUuid1772000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Verificar se há dados na tabela Stages
    const stagesCount = await queryRunner.query(
      `SELECT COUNT(*) as count FROM "Stages"`
    );
    
    const hasData = parseInt(stagesCount[0].count) > 0;

    // 2. Remover a foreign key constraint existente
    await queryRunner.query(
      `ALTER TABLE "Stages" DROP CONSTRAINT IF EXISTS "FK_Stages_Seasons_seasonId"`
    );

    if (hasData) {
      // 3a. Se há dados, fazer a conversão preservando os dados
      // Primeiro, adicionar uma coluna temporária
      await queryRunner.query(
        `ALTER TABLE "Stages" ADD "seasonId_temp" uuid`
      );

      // Converter os dados existentes (assumindo que são UUIDs válidos)
      await queryRunner.query(
        `UPDATE "Stages" SET "seasonId_temp" = "seasonId"::uuid`
      );

      // Remover a coluna antiga
      await queryRunner.query(`ALTER TABLE "Stages" DROP COLUMN "seasonId"`);

      // Renomear a coluna temporária
      await queryRunner.query(
        `ALTER TABLE "Stages" RENAME COLUMN "seasonId_temp" TO "seasonId"`
      );

      // Tornar a coluna NOT NULL
      await queryRunner.query(
        `ALTER TABLE "Stages" ALTER COLUMN "seasonId" SET NOT NULL`
      );
    } else {
      // 3b. Se não há dados, simplesmente remover e recriar
      await queryRunner.query(`ALTER TABLE "Stages" DROP COLUMN "seasonId"`);
      await queryRunner.query(
        `ALTER TABLE "Stages" ADD "seasonId" uuid NOT NULL`
      );
    }

    // 4. Adicionar a foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "Stages" ADD CONSTRAINT "FK_Stages_Seasons_seasonId" FOREIGN KEY ("seasonId") REFERENCES "Seasons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    // 5. Recriar o índice
    await queryRunner.query(
      `CREATE INDEX "IDX_Stages_seasonId" ON "Stages" ("seasonId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Remover o índice
    await queryRunner.query(`DROP INDEX "IDX_Stages_seasonId"`);

    // 2. Remover a foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "Stages" DROP CONSTRAINT "FK_Stages_Seasons_seasonId"`
    );

    // 3. Remover a coluna seasonId uuid
    await queryRunner.query(`ALTER TABLE "Stages" DROP COLUMN "seasonId"`);

    // 4. Adicionar de volta a coluna seasonId como varchar
    await queryRunner.query(
      `ALTER TABLE "Stages" ADD "seasonId" character varying NOT NULL`
    );
  }
} 