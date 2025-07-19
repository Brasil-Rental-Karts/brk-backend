import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePenaltyStatuses1769000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se o enum já tem o valor 'not_applied'
    const enumValues = await queryRunner.query(`
      SELECT unnest(enum_range(NULL::penalties_status_enum)) as value
    `);
    
    const hasNotApplied = enumValues.some((row: any) => row.value === 'not_applied');
    const hasPending = enumValues.some((row: any) => row.value === 'pending');
    const hasCancelled = enumValues.some((row: any) => row.value === 'cancelled');
    
    // Se já tem 'not_applied', a migração já foi aplicada
    if (hasNotApplied && !hasPending && !hasCancelled) {
      console.log('✅ Migração de status de penalidades já aplicada');
      return;
    }
    
    // Adicionar 'not_applied' se não existir
    if (!hasNotApplied) {
      await queryRunner.query(`
        ALTER TYPE "penalties_status_enum" ADD VALUE 'not_applied'
      `);
      console.log('✅ Adicionado valor "not_applied" ao enum');
    }
    
    // Atualizar dados existentes
    if (hasPending) {
      await queryRunner.query(`UPDATE "penalties" SET "status" = 'applied' WHERE "status" = 'pending'`);
      console.log('✅ Convertidas penalidades "pending" para "applied"');
    }
    
    if (hasCancelled) {
      await queryRunner.query(`UPDATE "penalties" SET "status" = 'not_applied' WHERE "status" = 'cancelled'`);
      console.log('✅ Convertidas penalidades "cancelled" para "not_applied"');
    }
    
    // Remover valores antigos do enum se existirem
    if (hasPending || hasCancelled) {
      // Criar novo enum sem os valores antigos
      await queryRunner.query(`
        ALTER TYPE "penalties_status_enum" RENAME TO "penalties_status_enum_old"
      `);
      
      await queryRunner.query(`
        CREATE TYPE "penalties_status_enum" AS ENUM('applied', 'not_applied', 'appealed')
      `);
      
      // Remover valor padrão temporariamente
      await queryRunner.query(`ALTER TABLE "penalties" ALTER COLUMN "status" DROP DEFAULT`);
      
      // Converter coluna para novo enum
      await queryRunner.query(`
        ALTER TABLE "penalties" ALTER COLUMN "status" TYPE "penalties_status_enum" USING "status"::text::"penalties_status_enum"
      `);
      
      // Remover enum antigo
      await queryRunner.query(`DROP TYPE "penalties_status_enum_old"`);
      
      // Restaurar valor padrão
      await queryRunner.query(`ALTER TABLE "penalties" ALTER COLUMN "status" SET DEFAULT 'applied'`);
      
      console.log('✅ Enum atualizado para conter apenas: applied, not_applied, appealed');
    }
    
    console.log('✅ Migração de status de penalidades concluída com sucesso');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Verificar se podemos reverter
    const enumValues = await queryRunner.query(`
      SELECT unnest(enum_range(NULL::penalties_status_enum)) as value
    `);
    
    const hasNotApplied = enumValues.some((row: any) => row.value === 'not_applied');
    
    if (!hasNotApplied) {
      console.log('✅ Não é possível reverter - enum já está no estado original');
      return;
    }
    
    // Reverter dados
    await queryRunner.query(`UPDATE "penalties" SET "status" = 'pending' WHERE "status" = 'applied'`);
    await queryRunner.query(`UPDATE "penalties" SET "status" = 'cancelled' WHERE "status" = 'not_applied'`);
    
    // Recriar enum original
    await queryRunner.query(`
      ALTER TYPE "penalties_status_enum" RENAME TO "penalties_status_enum_new"
    `);
    
    await queryRunner.query(`
      CREATE TYPE "penalties_status_enum" AS ENUM('pending', 'applied', 'cancelled', 'appealed')
    `);
    
    await queryRunner.query(`ALTER TABLE "penalties" ALTER COLUMN "status" DROP DEFAULT`);
    
    await queryRunner.query(`
      ALTER TABLE "penalties" ALTER COLUMN "status" TYPE "penalties_status_enum" USING "status"::text::"penalties_status_enum"
    `);
    
    await queryRunner.query(`DROP TYPE "penalties_status_enum_new"`);
    
    await queryRunner.query(`ALTER TABLE "penalties" ALTER COLUMN "status" SET DEFAULT 'pending'`);
    
    console.log('✅ Migração revertida com sucesso');
  }
} 