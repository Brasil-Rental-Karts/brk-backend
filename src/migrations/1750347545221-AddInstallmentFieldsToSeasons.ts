import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInstallmentFieldsToSeasons1750347545221 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Seasons" ADD "allowInstallment" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "Seasons" ADD "maxInstallments" integer`);
        await queryRunner.query(`ALTER TABLE "Seasons" ADD "interestRate" numeric(5,2)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Seasons" DROP COLUMN "interestRate"`);
        await queryRunner.query(`ALTER TABLE "Seasons" DROP COLUMN "maxInstallments"`);
        await queryRunner.query(`ALTER TABLE "Seasons" DROP COLUMN "allowInstallment"`);
    }

}
