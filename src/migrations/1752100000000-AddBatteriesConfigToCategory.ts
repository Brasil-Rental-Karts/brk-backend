import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBatteriesConfigToCategory1752100000000 implements MigrationInterface {
  name = 'AddBatteriesConfigToCategory1752100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar coluna batteriesConfig
    await queryRunner.query(`
      ALTER TABLE "Categories" 
      ADD COLUMN "batteriesConfig" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);

    // Migrar dados existentes para o novo formato
    await queryRunner.query(`
      UPDATE "Categories" 
      SET "batteriesConfig" = CASE 
        WHEN "batteryQuantity" = 1 THEN 
          '[{"name": "Bateria 1", "gridType": "", "order": 1, "isRequired": true, "description": "Bateria principal"}]'::jsonb
        WHEN "batteryQuantity" = 2 THEN 
          '[{"name": "Classificação", "gridType": "", "order": 1, "isRequired": true, "description": "Bateria de classificação"}, {"name": "Corrida", "gridType": "", "order": 2, "isRequired": true, "description": "Bateria principal"}]'::jsonb
        WHEN "batteryQuantity" = 3 THEN 
          '[{"name": "Classificação", "gridType": "", "order": 1, "isRequired": true, "description": "Bateria de classificação"}, {"name": "Semifinal", "gridType": "", "order": 2, "isRequired": true, "description": "Bateria semifinal"}, {"name": "Final", "gridType": "", "order": 3, "isRequired": true, "description": "Bateria final"}]'::jsonb
        ELSE 
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'name', 'Bateria ' || generate_series::text,
                'gridType', '',
                'order', generate_series,
                'isRequired', true,
                'description', 'Bateria ' || generate_series::text
              )
            )
            FROM generate_series(1, "batteryQuantity")
          )
      END
      WHERE "batteriesConfig" = '[]'::jsonb
    `);

    // Remover colunas antigas
    await queryRunner.query(`
      ALTER TABLE "Categories" 
      DROP COLUMN "batteryQuantity",
      DROP COLUMN "startingGridFormat"
    `);

    // Adicionar comentário na coluna
    await queryRunner.query(`
      COMMENT ON COLUMN "Categories"."batteriesConfig" IS 'Configuração das baterias em formato JSON'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recriar colunas antigas
    await queryRunner.query(`
      ALTER TABLE "Categories" 
      ADD COLUMN "batteryQuantity" integer NOT NULL DEFAULT 1,
      ADD COLUMN "startingGridFormat" varchar(255) NOT NULL DEFAULT '2x2'
    `);

    // Migrar dados de volta (melhor esforço)
    await queryRunner.query(`
      UPDATE "Categories" 
      SET 
        "batteryQuantity" = CASE 
          WHEN jsonb_array_length("batteriesConfig") IS NULL THEN 1
          ELSE jsonb_array_length("batteriesConfig")
        END,
        "startingGridFormat" = '2x2'
      WHERE "batteriesConfig" IS NOT NULL
    `);

    // Remover coluna nova
    await queryRunner.query(`
      ALTER TABLE "Categories" 
      DROP COLUMN "batteriesConfig"
    `);
  }
} 