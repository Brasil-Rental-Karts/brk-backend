import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentMethodToSeasonRegistrations1750501000000
  implements MigrationInterface
{
  name = 'AddPaymentMethodToSeasonRegistrations1750501000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar a coluna paymentMethod à tabela SeasonRegistrations
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrations" ADD "paymentMethod" character varying(20)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover a coluna paymentMethod
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrations" DROP COLUMN "paymentMethod"`
    );
  }
}
