import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveBoletoSupport1750500000000 implements MigrationInterface {
    name = 'RemoveBoletoSupport1750500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Remover a coluna boletoInstallments da tabela Seasons
        await queryRunner.query(`ALTER TABLE "Seasons" DROP COLUMN "boletoInstallments"`);

        // Atualizar o enum AsaasPayments_billingtype_enum removendo BOLETO
        await queryRunner.query(`ALTER TYPE "public"."AsaasPayments_billingtype_enum" RENAME TO "AsaasPayments_billingtype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."AsaasPayments_billingtype_enum" AS ENUM('CREDIT_CARD', 'PIX')`);
        await queryRunner.query(`ALTER TABLE "AsaasPayments" ALTER COLUMN "billingType" TYPE "public"."AsaasPayments_billingtype_enum" USING "billingType"::"text"::"public"."AsaasPayments_billingtype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."AsaasPayments_billingtype_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Recriar o enum com BOLETO
        await queryRunner.query(`CREATE TYPE "public"."AsaasPayments_billingtype_enum_old" AS ENUM('BOLETO', 'CREDIT_CARD', 'PIX')`);
        await queryRunner.query(`ALTER TABLE "AsaasPayments" ALTER COLUMN "billingType" TYPE "public"."AsaasPayments_billingtype_enum_old" USING "billingType"::"text"::"public"."AsaasPayments_billingtype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."AsaasPayments_billingtype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."AsaasPayments_billingtype_enum_old" RENAME TO "AsaasPayments_billingtype_enum"`);

        // Recriar a coluna boletoInstallments
        await queryRunner.query(`ALTER TABLE "Seasons" ADD "boletoInstallments" integer NOT NULL DEFAULT '1'`);
    }
} 