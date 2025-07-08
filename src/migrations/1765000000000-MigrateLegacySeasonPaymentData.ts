import { MigrationInterface, QueryRunner } from "typeorm";

export class MigrateLegacySeasonPaymentData1765000000000 implements MigrationInterface {
    name = 'MigrateLegacySeasonPaymentData1765000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Adicionar coluna paymentConditions
        await queryRunner.query(`ALTER TABLE "Seasons" ADD COLUMN "paymentConditions" jsonb`);

        // 2. Migrar dados legados para paymentConditions
        await queryRunner.query(`
            UPDATE "Seasons"
            SET "paymentConditions" = jsonb_build_array(
                jsonb_build_object(
                    'type', "inscriptionType",
                    'value', "inscriptionValue",
                    'description', CASE WHEN "inscriptionType" = 'por_temporada' THEN 'Pagamento por temporada' ELSE 'Pagamento por etapa' END,
                    'enabled', true,
                    'paymentMethods', COALESCE((SELECT jsonb_agg(pm) FROM unnest(string_to_array("paymentMethods", ',')) AS pm), '[]'::jsonb),
                    'pixInstallments', COALESCE("pixInstallments", 1),
                    'creditCardInstallments', COALESCE("creditCardInstallments", 1)
                )
            )
            WHERE ("paymentConditions" IS NULL OR jsonb_array_length("paymentConditions") = 0)
              AND "inscriptionType" IS NOT NULL AND "inscriptionValue" IS NOT NULL;
        `);

        // 3. Garantir que todos os campos novos existam em paymentConditions
        await queryRunner.query(`
            UPDATE "Seasons"
            SET "paymentConditions" = (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'type', c->>'type',
                        'value', (c->>'value')::numeric,
                        'description', c->>'description',
                        'enabled', (c->>'enabled')::boolean,
                        'paymentMethods', COALESCE(c->'paymentMethods', '[]'::jsonb),
                        'pixInstallments', COALESCE((c->>'pixInstallments')::integer, 1),
                        'creditCardInstallments', COALESCE((c->>'creditCardInstallments')::integer, 1)
                    )
                )
                FROM jsonb_array_elements("paymentConditions") AS c
            )
            WHERE "paymentConditions" IS NOT NULL AND jsonb_array_length("paymentConditions") > 0;
        `);

        // 4. Remover colunas legadas
        await queryRunner.query(`ALTER TABLE "Seasons" DROP COLUMN IF EXISTS "inscriptionType"`);
        await queryRunner.query(`ALTER TABLE "Seasons" DROP COLUMN IF EXISTS "inscriptionValue"`);
        await queryRunner.query(`ALTER TABLE "Seasons" DROP COLUMN IF EXISTS "paymentMethods"`);
        await queryRunner.query(`ALTER TABLE "Seasons" DROP COLUMN IF EXISTS "pixInstallments"`);
        await queryRunner.query(`ALTER TABLE "Seasons" DROP COLUMN IF EXISTS "creditCardInstallments"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 1. Recriar colunas legadas
        await queryRunner.query(`ALTER TABLE "Seasons" ADD COLUMN "inscriptionType" varchar(20)`);
        await queryRunner.query(`ALTER TABLE "Seasons" ADD COLUMN "inscriptionValue" decimal(10,2)`);
        await queryRunner.query(`ALTER TABLE "Seasons" ADD COLUMN "paymentMethods" text`);
        await queryRunner.query(`ALTER TABLE "Seasons" ADD COLUMN "pixInstallments" int DEFAULT 1`);
        await queryRunner.query(`ALTER TABLE "Seasons" ADD COLUMN "creditCardInstallments" int DEFAULT 1`);

        // 2. Popular colunas legadas a partir do primeiro paymentCondition ativo
        await queryRunner.query(`
            UPDATE "Seasons"
            SET 
                "inscriptionType" = (pc->>'type'),
                "inscriptionValue" = (pc->>'value')::numeric,
                "paymentMethods" = array_to_string(ARRAY(SELECT jsonb_array_elements_text(pc->'paymentMethods')), ','),
                "pixInstallments" = COALESCE((pc->>'pixInstallments')::integer, 1),
                "creditCardInstallments" = COALESCE((pc->>'creditCardInstallments')::integer, 1)
            FROM (
                SELECT id, pc
                FROM "Seasons", LATERAL (
                    SELECT pc FROM jsonb_array_elements("paymentConditions") AS pc WHERE (pc->>'enabled')::boolean LIMIT 1
                ) sub
            ) subq
            WHERE "Seasons".id = subq.id;
        `);

        // 3. Remover coluna paymentConditions
        await queryRunner.query(`ALTER TABLE "Seasons" DROP COLUMN IF EXISTS "paymentConditions"`);
    }
} 