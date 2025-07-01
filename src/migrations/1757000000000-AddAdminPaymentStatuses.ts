import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAdminPaymentStatuses1757000000000 implements MigrationInterface {
    name = 'AddAdminPaymentStatuses1757000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Adicionar novos valores ao enum PaymentStatus
        await queryRunner.query(`ALTER TYPE "public"."SeasonRegistrations_paymentstatus_enum" ADD VALUE 'exempt'`);
        await queryRunner.query(`ALTER TYPE "public"."SeasonRegistrations_paymentstatus_enum" ADD VALUE 'direct_payment'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Nota: PostgreSQL não permite remover valores de enum diretamente
        // Seria necessário recriar o enum sem os valores, mas isso pode afetar dados existentes
        // Por isso, não implementamos o down para esta migração
        console.log('Warning: Cannot remove enum values safely. Manual intervention may be required.');
    }
} 