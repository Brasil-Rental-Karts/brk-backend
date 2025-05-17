import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGoogleAuthFields1747502962551 implements MigrationInterface {
    name = 'AddGoogleAuthFields1747502962551'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Users" ADD "googleId" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "Users" ADD "profilePicture" character varying(255)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Users" DROP COLUMN "profilePicture"`);
        await queryRunner.query(`ALTER TABLE "Users" DROP COLUMN "googleId"`);
    }

}
