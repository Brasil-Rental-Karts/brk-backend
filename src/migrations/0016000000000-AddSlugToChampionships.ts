import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSlugToChampionships1750206736128 implements MigrationInterface {
    name = 'AddSlugToChampionships1750206736128'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Championships" ADD "slug" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "Championships" ADD CONSTRAINT "UQ_160e332dc33c3af4706a33831fe" UNIQUE ("slug")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Championships" DROP CONSTRAINT "UQ_160e332dc33c3af4706a33831fe"`);
        await queryRunner.query(`ALTER TABLE "Championships" DROP COLUMN "slug"`);
    }

}
