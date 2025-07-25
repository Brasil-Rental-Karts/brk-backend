import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentTables0005000000000 implements MigrationInterface {
  name = 'CreatePaymentTables0005000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create RegistrationStatus enum
    await queryRunner.query(
      `CREATE TYPE "public"."SeasonRegistrations_status_enum" AS ENUM('pending', 'payment_pending', 'confirmed', 'cancelled', 'expired')`
    );

    // Create PaymentStatus enum
    await queryRunner.query(
      `CREATE TYPE "public"."SeasonRegistrations_paymentstatus_enum" AS ENUM('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded')`
    );

    // Create AsaasBillingType enum
    await queryRunner.query(
      `CREATE TYPE "public"."AsaasPayments_billingtype_enum" AS ENUM('BOLETO', 'CREDIT_CARD', 'PIX', 'DEBIT_CARD')`
    );

    // Create AsaasPaymentStatus enum
    await queryRunner.query(
      `CREATE TYPE "public"."AsaasPayments_status_enum" AS ENUM('PENDING', 'RECEIVED', 'CONFIRMED', 'OVERDUE', 'REFUNDED', 'RECEIVED_IN_CASH', 'REFUND_REQUESTED', 'REFUND_IN_PROGRESS', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL', 'DUNNING_REQUESTED', 'DUNNING_RECEIVED', 'AWAITING_RISK_ANALYSIS')`
    );

    // Create SeasonRegistrations table
    await queryRunner.query(`
      CREATE TABLE "SeasonRegistrations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "userId" uuid NOT NULL,
        "seasonId" uuid NOT NULL,
        "status" "public"."SeasonRegistrations_status_enum" NOT NULL DEFAULT 'pending',
        "paymentStatus" "public"."SeasonRegistrations_paymentstatus_enum" NOT NULL DEFAULT 'pending',
        "amount" numeric(10,2) NOT NULL,
        "paymentDate" TIMESTAMP WITH TIME ZONE,
        "confirmedAt" TIMESTAMP WITH TIME ZONE,
        "cancelledAt" TIMESTAMP WITH TIME ZONE,
        "cancellationReason" character varying(255),
        CONSTRAINT "PK_SeasonRegistrations" PRIMARY KEY ("id")
      )
    `);

    // Create AsaasPayments table
    await queryRunner.query(`
      CREATE TABLE "AsaasPayments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "registrationId" uuid NOT NULL,
        "asaasPaymentId" character varying(100) NOT NULL,
        "asaasCustomerId" character varying(100) NOT NULL,
        "billingType" "public"."AsaasPayments_billingtype_enum" NOT NULL,
        "status" "public"."AsaasPayments_status_enum" NOT NULL DEFAULT 'PENDING',
        "value" numeric(10,2) NOT NULL,
        "netValue" numeric(10,2),
        "dueDate" date NOT NULL,
        "description" text,
        "invoiceUrl" text,
        "bankSlipUrl" text,
        "pixQrCode" text,
        "pixCopyPaste" text,
        "paymentDate" TIMESTAMP WITH TIME ZONE,
        "clientPaymentDate" TIMESTAMP WITH TIME ZONE,
        "rawResponse" jsonb,
        "webhookData" jsonb,
        CONSTRAINT "PK_AsaasPayments" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_AsaasPayments_asaasPaymentId" UNIQUE ("asaasPaymentId")
      )
    `);

    // Create indexes
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_SeasonRegistrations_user_season" ON "SeasonRegistrations" ("userId", "seasonId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_SeasonRegistrations_userId" ON "SeasonRegistrations" ("userId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_SeasonRegistrations_seasonId" ON "SeasonRegistrations" ("seasonId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_SeasonRegistrations_status" ON "SeasonRegistrations" ("status")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_SeasonRegistrations_paymentStatus" ON "SeasonRegistrations" ("paymentStatus")`
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_AsaasPayments_asaasPaymentId" ON "AsaasPayments" ("asaasPaymentId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_AsaasPayments_registrationId" ON "AsaasPayments" ("registrationId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_AsaasPayments_status" ON "AsaasPayments" ("status")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_AsaasPayments_billingType" ON "AsaasPayments" ("billingType")`
    );

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "SeasonRegistrations" 
      ADD CONSTRAINT "FK_SeasonRegistrations_userId" 
      FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "SeasonRegistrations" 
      ADD CONSTRAINT "FK_SeasonRegistrations_seasonId" 
      FOREIGN KEY ("seasonId") REFERENCES "Seasons"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "AsaasPayments" 
      ADD CONSTRAINT "FK_AsaasPayments_registrationId" 
      FOREIGN KEY ("registrationId") REFERENCES "SeasonRegistrations"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "AsaasPayments" DROP CONSTRAINT "FK_AsaasPayments_registrationId"`
    );
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrations" DROP CONSTRAINT "FK_SeasonRegistrations_seasonId"`
    );
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrations" DROP CONSTRAINT "FK_SeasonRegistrations_userId"`
    );

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_AsaasPayments_billingType"`);
    await queryRunner.query(`DROP INDEX "IDX_AsaasPayments_status"`);
    await queryRunner.query(`DROP INDEX "IDX_AsaasPayments_registrationId"`);
    await queryRunner.query(`DROP INDEX "IDX_AsaasPayments_asaasPaymentId"`);

    await queryRunner.query(
      `DROP INDEX "IDX_SeasonRegistrations_paymentStatus"`
    );
    await queryRunner.query(`DROP INDEX "IDX_SeasonRegistrations_status"`);
    await queryRunner.query(`DROP INDEX "IDX_SeasonRegistrations_seasonId"`);
    await queryRunner.query(`DROP INDEX "IDX_SeasonRegistrations_userId"`);
    await queryRunner.query(`DROP INDEX "IDX_SeasonRegistrations_user_season"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "AsaasPayments"`);
    await queryRunner.query(`DROP TABLE "SeasonRegistrations"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "public"."AsaasPayments_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."AsaasPayments_billingtype_enum"`
    );
    await queryRunner.query(
      `DROP TYPE "public"."SeasonRegistrations_paymentstatus_enum"`
    );
    await queryRunner.query(
      `DROP TYPE "public"."SeasonRegistrations_status_enum"`
    );
  }
}
