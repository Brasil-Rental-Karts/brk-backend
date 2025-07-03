import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCurrentChampionshipMembersAsStaff1755000000000 implements MigrationInterface {
    name = 'AddCurrentChampionshipMembersAsStaff1755000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Buscar todos os campeonatos que têm ownerId
        const championships = await queryRunner.query(`
            SELECT id, "ownerId" 
            FROM "Championships" 
            WHERE "ownerId" IS NOT NULL
        `);

        // Para cada campeonato, adicionar o owner como staff com todas as permissões
        for (const championship of championships) {
            // Verificar se já existe um registro de staff para este usuário neste campeonato
            const existingStaff = await queryRunner.query(`
                SELECT id 
                FROM "ChampionshipStaff" 
                WHERE "championshipId" = $1 AND "userId" = $2
            `, [championship.id, championship.ownerId]);

            if (existingStaff.length === 0) {
                // Inserir o owner como staff com todas as permissões
                await queryRunner.query(`
                    INSERT INTO "ChampionshipStaff" 
                    ("championshipId", "userId", "role", "isActive", "addedById", "addedAt", "permissions")
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    championship.id,
                    championship.ownerId,
                    'staff',
                    true,
                    championship.ownerId, // O próprio owner se adiciona
                    new Date(),
                    JSON.stringify({
                        seasons: true,
                        categories: true,
                        stages: true,
                        pilots: true,
                        regulations: true,
                        editChampionship: true,
                        gridTypes: true,
                        scoringSystems: true,
                        sponsors: true,
                        staff: true,
                        asaasAccount: true
                    })
                ]);
            }
        }

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remover todos os registros de staff que foram adicionados por esta migration
        // (apenas os que têm todas as permissões habilitadas)
        await queryRunner.query(`
            DELETE FROM "ChampionshipStaff" 
            WHERE "permissions" = '{"seasons":true,"categories":true,"stages":true,"pilots":true,"regulations":true,"editChampionship":true,"gridTypes":true,"scoringSystems":true,"sponsors":true,"staff":true,"asaasAccount":true}'::jsonb
        `);
    }
} 