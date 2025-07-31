import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInscriptionTypeToSeasonRegistrations1773000000000
  implements MigrationInterface
{
  name = 'AddInscriptionTypeToSeasonRegistrations1773000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar o enum para o tipo de inscrição
    await queryRunner.query(
      `CREATE TYPE "public"."SeasonRegistrations_inscriptiontype_enum" AS ENUM('por_temporada', 'por_etapa')`
    );

    // Adicionar a coluna inscriptionType
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrations" ADD COLUMN "inscriptionType" "public"."SeasonRegistrations_inscriptiontype_enum" NOT NULL DEFAULT 'por_etapa'`
    );

    // Executar a query para identificar registros que devem ser marcados como por_temporada
    const registrationsToUpdate = await queryRunner.query(`
      select ch."name", ss."name", ct."name", sr.id, count(1)
        from public."SeasonRegistrationCategories" src 
      inner join public."SeasonRegistrations" sr on sr.id = src."registrationId"
      inner join public."Seasons" ss on ss.id = sr."seasonId"
      inner join public."Championships" ch on ch.id = ss."championshipId"
      inner join public."Categories" ct on ct.id = src."categoryId"
      where (src."registrationId" not in (select srs."registrationId" from public."SeasonRegistrationStages" srs))
         or ((select count(1) from public."Stages" st where st."seasonId" = sr."seasonId") 
           = (select count(1) from public."SeasonRegistrationStages" srs where srs."registrationId" = sr.id))
      group by ch."name", ss."name", ct."name", sr.id
      order by ch."name", ss."name", ct."name"
    `);

    // Atualizar os registros identificados como por_temporada
    if (registrationsToUpdate.length > 0) {
      const registrationIds = registrationsToUpdate.map((reg: any) => reg.id);
      await queryRunner.query(
        `UPDATE "SeasonRegistrations" SET "inscriptionType" = 'por_temporada' WHERE id = ANY($1)`,
        [registrationIds]
      );
    }

    // Remover o valor padrão após a migração dos dados
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrations" ALTER COLUMN "inscriptionType" DROP DEFAULT`
    );

    // Criar índice para melhor performance
    await queryRunner.query(
      `CREATE INDEX "IDX_SeasonRegistrations_inscriptionType" ON "SeasonRegistrations" ("inscriptionType")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover o índice
    await queryRunner.query(
      `DROP INDEX "public"."IDX_SeasonRegistrations_inscriptionType"`
    );

    // Remover a coluna
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrations" DROP COLUMN "inscriptionType"`
    );

    // Remover o tipo enum
    await queryRunner.query(
      `DROP TYPE "public"."SeasonRegistrations_inscriptiontype_enum"`
    );
  }
} 