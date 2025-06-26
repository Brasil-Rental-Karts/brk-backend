import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveIncomeValueFromChampionships1752000000000 implements MigrationInterface {
    name = 'RemoveIncomeValueFromChampionships1752000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Championships" DROP COLUMN "incomeValue"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Championships" ADD "incomeValue" decimal(10,2) NOT NULL`);
    }
} 