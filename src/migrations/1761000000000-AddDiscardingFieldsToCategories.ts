import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDiscardingFieldsToCategories1761000000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Categories" ADD "allowDiscarding" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "Categories" ADD "discardingType" character varying`);
        await queryRunner.query(`ALTER TABLE "Categories" ADD "discardingQuantity" integer`);
        await queryRunner.query(`ALTER TABLE "Categories" ADD CONSTRAINT "CHK_Categories_discardingType" CHECK ("discardingType" IN ('bateria', 'etapa'))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Categories" DROP CONSTRAINT "CHK_Categories_discardingType"`);
        await queryRunner.query(`ALTER TABLE "Categories" DROP COLUMN "discardingQuantity"`);
        await queryRunner.query(`ALTER TABLE "Categories" DROP COLUMN "discardingType"`);
        await queryRunner.query(`ALTER TABLE "Categories" DROP COLUMN "allowDiscarding"`);
    }

} 