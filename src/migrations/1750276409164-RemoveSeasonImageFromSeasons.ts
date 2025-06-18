import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveSeasonImageFromSeasons1750276409164 implements MigrationInterface {
    name = 'RemoveSeasonImageFromSeasons1750276409164'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Seasons" DROP COLUMN "seasonImage"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Seasons" ADD "seasonImage" text NOT NULL`);
    }

}
