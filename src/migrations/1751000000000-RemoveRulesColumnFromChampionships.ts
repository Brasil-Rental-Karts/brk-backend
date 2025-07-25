import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveRulesColumnFromChampionships1751000000000
  implements MigrationInterface
{
  name = 'RemoveRulesColumnFromChampionships1751000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remover completamente a coluna rules da tabela Championships
    await queryRunner.query(
      `ALTER TABLE "Championships" DROP COLUMN IF EXISTS "rules"`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Adicionar a coluna rules de volta se necessário (nullable)
    await queryRunner.query(`ALTER TABLE "Championships" ADD "rules" text`);
  }
}
