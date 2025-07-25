import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStaffPermissions1754000000000 implements MigrationInterface {
  name = 'AddStaffPermissions1754000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar coluna de permissões como JSON
    await queryRunner.query(`
            ALTER TABLE "ChampionshipStaff" 
            ADD COLUMN "permissions" JSONB DEFAULT '{}'::jsonb
        `);

    // Criar índice para melhor performance em consultas de permissões
    await queryRunner.query(`
            CREATE INDEX "IDX_ChampionshipStaff_permissions" 
            ON "ChampionshipStaff" USING GIN ("permissions")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índice
    await queryRunner.query(`DROP INDEX "IDX_ChampionshipStaff_permissions"`);

    // Remover coluna
    await queryRunner.query(`
            ALTER TABLE "ChampionshipStaff" 
            DROP COLUMN "permissions"
        `);
  }
}
