import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailConfirmationFieldsToUsers1748001000000 implements MigrationInterface {
    name = 'AddEmailConfirmationFieldsToUsers1748001000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Users" ADD COLUMN "emailConfirmed" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "Users" ADD COLUMN "emailConfirmationToken" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "Users" ADD COLUMN "emailConfirmationExpires" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Users" DROP COLUMN "emailConfirmationExpires"`);
        await queryRunner.query(`ALTER TABLE "Users" DROP COLUMN "emailConfirmationToken"`);
        await queryRunner.query(`ALTER TABLE "Users" DROP COLUMN "emailConfirmed"`);
    }
} 