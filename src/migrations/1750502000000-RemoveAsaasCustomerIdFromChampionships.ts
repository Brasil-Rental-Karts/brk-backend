import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveAsaasCustomerIdFromChampionships1750502000000
  implements MigrationInterface
{
  name = 'RemoveAsaasCustomerIdFromChampionships1750502000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Championships" DROP COLUMN "asaasCustomerId"`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Championships" ADD "asaasCustomerId" character varying(255)`
    );
  }
}
