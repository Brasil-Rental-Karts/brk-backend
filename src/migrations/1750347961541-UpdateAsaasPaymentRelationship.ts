import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateAsaasPaymentRelationship1750347961541 implements MigrationInterface {
    name = 'UpdateAsaasPaymentRelationship1750347961541'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "AsaasPayments" ADD "asaasInstallmentId" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "AsaasPayments" DROP CONSTRAINT "FK_220c82bf7e2764042531a9e1a12"`);
        await queryRunner.query(`ALTER TABLE "AsaasPayments" DROP CONSTRAINT "UQ_220c82bf7e2764042531a9e1a12"`);
        await queryRunner.query(`ALTER TABLE "AsaasPayments" ADD CONSTRAINT "FK_220c82bf7e2764042531a9e1a12" FOREIGN KEY ("registrationId") REFERENCES "SeasonRegistrations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "AsaasPayments" DROP CONSTRAINT "FK_220c82bf7e2764042531a9e1a12"`);
        await queryRunner.query(`ALTER TABLE "AsaasPayments" ADD CONSTRAINT "UQ_220c82bf7e2764042531a9e1a12" UNIQUE ("registrationId")`);
        await queryRunner.query(`ALTER TABLE "AsaasPayments" ADD CONSTRAINT "FK_220c82bf7e2764042531a9e1a12" FOREIGN KEY ("registrationId") REFERENCES "SeasonRegistrations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "AsaasPayments" DROP COLUMN "asaasInstallmentId"`);
    }

}
