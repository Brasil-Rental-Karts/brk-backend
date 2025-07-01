import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateExistingStaffWithFullPermissions1755000000001 implements MigrationInterface {
    name = 'UpdateExistingStaffWithFullPermissions1755000000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Atualizar todos os membros do staff que têm permissões vazias ou nulas
        // para terem todas as permissões habilitadas
        const result = await queryRunner.query(`
            UPDATE "ChampionshipStaff" 
            SET "permissions" = $1::jsonb
            WHERE "permissions" IS NULL 
               OR "permissions" = '{}'::jsonb 
               OR "permissions" = 'null'::jsonb
        `, [JSON.stringify({
            seasons: true,
            categories: true,
            stages: true,
            pilots: true,
            regulations: true,
            raceDay: true,
            editChampionship: true,
            gridTypes: true,
            scoringSystems: true,
            sponsors: true,
            staff: true,
            asaasAccount: true
        })]);

        console.log(`Migration completed: Updated ${result[1]} existing staff members with full permissions`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverter as permissões para vazio (não é possível saber quais tinham permissões específicas antes)
        await queryRunner.query(`
            UPDATE "ChampionshipStaff" 
            SET "permissions" = '{}'::jsonb
            WHERE "permissions" = '{"seasons":true,"categories":true,"stages":true,"pilots":true,"regulations":true,"raceDay":true,"editChampionship":true,"gridTypes":true,"scoringSystems":true,"sponsors":true,"staff":true,"asaasAccount":true}'::jsonb
        `);
    }
} 