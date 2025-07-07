import { MigrationInterface, QueryRunner } from "typeorm";

export class FixPaymentMethodsNullValues1755100000000 implements MigrationInterface {
    name = 'FixPaymentMethodsNullValues1755100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Corrigir registros onde paymentMethods está null, vazio ou com valores inválidos
        await queryRunner.query(`
            UPDATE "Seasons" 
            SET "paymentMethods" = 'pix' 
            WHERE "paymentMethods" IS NULL 
               OR "paymentMethods" = '' 
               OR "paymentMethods" = 'null'
               OR "paymentMethods" = 'undefined'
        `);
        
        // Garantir que não há valores null no campo
        await queryRunner.query(`
            ALTER TABLE "Seasons" 
            ALTER COLUMN "paymentMethods" SET NOT NULL
        `);
        
        // Definir valor padrão para novos registros
        await queryRunner.query(`
            ALTER TABLE "Seasons" 
            ALTER COLUMN "paymentMethods" SET DEFAULT 'pix'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remover o valor padrão
        await queryRunner.query(`
            ALTER TABLE "Seasons" 
            ALTER COLUMN "paymentMethods" DROP DEFAULT
        `);
        
        // Permitir valores null novamente (se necessário para rollback)
        await queryRunner.query(`
            ALTER TABLE "Seasons" 
            ALTER COLUMN "paymentMethods" DROP NOT NULL
        `);
    }
} 