import { MigrationInterface, QueryRunner } from "typeorm";

export class AddClassificationPermissionToExistingStaff1763000000000 implements MigrationInterface {
    name = 'AddClassificationPermissionToExistingStaff1763000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Buscar todos os membros do staff que têm permissões configuradas
        const staffMembers = await queryRunner.query(`
            SELECT id, permissions 
            FROM "ChampionshipStaff" 
            WHERE "permissions" IS NOT NULL 
              AND "permissions" != '{}'::jsonb 
              AND "permissions" != 'null'::jsonb
        `);

        // Para cada membro do staff, adicionar a permissão "classification"
        for (const staff of staffMembers) {
            try {
                let permissions = typeof staff.permissions === 'string' 
                    ? JSON.parse(staff.permissions) 
                    : staff.permissions;

                // Adicionar a permissão "classification" apenas se não existir
                if (!permissions.hasOwnProperty('classification')) {
                    permissions.classification = true;

                    // Atualizar o registro
                    await queryRunner.query(`
                        UPDATE "ChampionshipStaff" 
                        SET "permissions" = $1::jsonb
                        WHERE id = $2
                    `, [JSON.stringify(permissions), staff.id]);
                }
            } catch (error) {
                console.error(`Erro ao processar permissões para staff ${staff.id}:`, error);
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remover a permissão "classification" de todos os membros do staff
        const staffMembers = await queryRunner.query(`
            SELECT id, permissions 
            FROM "ChampionshipStaff" 
            WHERE "permissions" IS NOT NULL 
              AND "permissions" != '{}'::jsonb 
              AND "permissions" != 'null'::jsonb
        `);

        for (const staff of staffMembers) {
            try {
                let permissions = typeof staff.permissions === 'string' 
                    ? JSON.parse(staff.permissions) 
                    : staff.permissions;

                // Remover a permissão "classification"
                if (permissions.hasOwnProperty('classification')) {
                    delete permissions.classification;

                    // Atualizar o registro
                    await queryRunner.query(`
                        UPDATE "ChampionshipStaff" 
                        SET "permissions" = $1::jsonb
                        WHERE id = $2
                    `, [JSON.stringify(permissions), staff.id]);
                }
            } catch (error) {
                console.error(`Erro ao processar permissões para staff ${staff.id}:`, error);
            }
        }
    }
} 