import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveDebitCardFromEnums0011000000000 implements MigrationInterface {
    name = 'RemoveDebitCardFromEnums0011000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Remover DEBIT_CARD do enum AsaasPayments_billingtype_enum
        await queryRunner.query(`ALTER TYPE "public"."AsaasPayments_billingtype_enum" RENAME TO "AsaasPayments_billingtype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."AsaasPayments_billingtype_enum" AS ENUM('BOLETO', 'CREDIT_CARD', 'PIX')`);
        await queryRunner.query(`ALTER TABLE "AsaasPayments" ALTER COLUMN "billingType" TYPE "public"."AsaasPayments_billingtype_enum" USING "billingType"::"text"::"public"."AsaasPayments_billingtype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."AsaasPayments_billingtype_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverter enum AsaasPayments_billingtype_enum
        await queryRunner.query(`CREATE TYPE "public"."AsaasPayments_billingtype_enum_old" AS ENUM('BOLETO', 'CREDIT_CARD', 'PIX', 'DEBIT_CARD')`);
        await queryRunner.query(`ALTER TABLE "AsaasPayments" ALTER COLUMN "billingType" TYPE "public"."AsaasPayments_billingtype_enum_old" USING "billingType"::"text"::"public"."AsaasPayments_billingtype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."AsaasPayments_billingtype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."AsaasPayments_billingtype_enum_old" RENAME TO "AsaasPayments_billingtype_enum"`);
    }
} 