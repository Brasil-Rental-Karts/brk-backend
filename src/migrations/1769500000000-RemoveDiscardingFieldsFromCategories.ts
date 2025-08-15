import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveDiscardingFieldsFromCategories1769500000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remover constraint de verificação se existir
    await queryRunner.query(
      `ALTER TABLE "Categories" DROP CONSTRAINT IF EXISTS "CHK_Categories_discardingType"`
    );

    // Remover colunas de descarte se existirem
    await queryRunner.query(
      `ALTER TABLE "Categories" DROP COLUMN IF EXISTS "allowDiscarding"`
    );
    await queryRunner.query(
      `ALTER TABLE "Categories" DROP COLUMN IF EXISTS "discardingType"`
    );
    await queryRunner.query(
      `ALTER TABLE "Categories" DROP COLUMN IF EXISTS "discardingQuantity"`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Sem reversão: campos de descarte foram descontinuados
  }
}


