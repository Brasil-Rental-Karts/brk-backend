import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRaceDayPermission1758000000000 implements MigrationInterface {
    name = 'AddRaceDayPermission1758000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Adicionar a permissão raceDay como false para todos os membros existentes do staff
        // que não são owners (owners já têm todas as permissões)
        const result = await queryRunner.query(`
            UPDATE "ChampionshipStaff" 
            SET "permissions" = "permissions" || '{"raceDay": false}'::jsonb
            WHERE "permissions" IS NOT NULL 
              AND "permissions" != '{}'::jsonb
              AND "permissions" != 'null'::jsonb
        `);

        console.log(`Migration completed: Added raceDay permission to existing staff members`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remover a permissão raceDay de todos os membros do staff
        await queryRunner.query(`
            UPDATE "ChampionshipStaff" 
            SET "permissions" = "permissions" - 'raceDay'
            WHERE "permissions" ? 'raceDay'
        `);
    }
} 