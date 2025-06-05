import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateVipPreregisterTable1749123504582 implements MigrationInterface {
    name = 'CreateVipPreregisterTable1749123504582'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "MemberProfiles" DROP CONSTRAINT "FK_MemberProfiles_Users_id"`);
        await queryRunner.query(`ALTER TABLE "Seasons" DROP CONSTRAINT "FK_Seasons_Championships_championshipId"`);
        await queryRunner.query(`ALTER TABLE "Championships" DROP CONSTRAINT "FK_Championships_Users_ownerId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_Seasons_championshipId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_Seasons_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_Seasons_startDate"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_Seasons_endDate"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_Seasons_inscriptionType"`);
        await queryRunner.query(`CREATE TABLE "vip_preregister" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, CONSTRAINT "UQ_158477db93c316f97243ed7cb90" UNIQUE ("email"), CONSTRAINT "PK_c60df9630d14d19d010fd1bfb68" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "MemberProfiles" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "MemberProfiles" DROP COLUMN "state"`);
        await queryRunner.query(`ALTER TABLE "MemberProfiles" ADD "state" character varying(2) NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "Seasons" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "Seasons" ADD "description" character varying(1000) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "Seasons" DROP COLUMN "championshipId"`);
        await queryRunner.query(`ALTER TABLE "Seasons" ADD "championshipId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "Championships" DROP COLUMN "ownerId"`);
        await queryRunner.query(`ALTER TABLE "Championships" ADD "ownerId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "MemberProfiles" ADD CONSTRAINT "FK_b812d4719752f67b1f1727ef700" FOREIGN KEY ("id") REFERENCES "Users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "MemberProfiles" DROP CONSTRAINT "FK_b812d4719752f67b1f1727ef700"`);
        await queryRunner.query(`ALTER TABLE "Championships" DROP COLUMN "ownerId"`);
        await queryRunner.query(`ALTER TABLE "Championships" ADD "ownerId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "Seasons" DROP COLUMN "championshipId"`);
        await queryRunner.query(`ALTER TABLE "Seasons" ADD "championshipId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "Seasons" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "Seasons" ADD "description" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "MemberProfiles" DROP COLUMN "state"`);
        await queryRunner.query(`ALTER TABLE "MemberProfiles" ADD "state" character(2) NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "MemberProfiles" ALTER COLUMN "id" DROP DEFAULT`);
        await queryRunner.query(`DROP TABLE "vip_preregister"`);
        await queryRunner.query(`CREATE INDEX "IDX_Seasons_inscriptionType" ON "Seasons" ("inscriptionType") `);
        await queryRunner.query(`CREATE INDEX "IDX_Seasons_endDate" ON "Seasons" ("endDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_Seasons_startDate" ON "Seasons" ("startDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_Seasons_status" ON "Seasons" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_Seasons_championshipId" ON "Seasons" ("championshipId") `);
        await queryRunner.query(`ALTER TABLE "Championships" ADD CONSTRAINT "FK_Championships_Users_ownerId" FOREIGN KEY ("ownerId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Seasons" ADD CONSTRAINT "FK_Seasons_Championships_championshipId" FOREIGN KEY ("championshipId") REFERENCES "Championships"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "MemberProfiles" ADD CONSTRAINT "FK_MemberProfiles_Users_id" FOREIGN KEY ("id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
