import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSponsorTypeToChampionships1753000000000 implements MigrationInterface {
    name = 'AddSponsorTypeToChampionships1753000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Atualizar sponsors existentes para adicionar o campo type como 'sponsor' (padrão)
        await queryRunner.query(`
            UPDATE "Championships" 
            SET "sponsors" = (
                SELECT jsonb_agg(
                    CASE 
                        WHEN sponsor->>'type' IS NULL THEN sponsor || '{"type": "sponsor"}'::jsonb
                        ELSE sponsor
                    END
                )
                FROM jsonb_array_elements("sponsors") AS sponsor
            )
            WHERE "sponsors" IS NOT NULL AND jsonb_array_length("sponsors") > 0
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remover o campo type dos sponsors (voltar ao estado anterior)
        await queryRunner.query(`
            UPDATE "Championships" 
            SET "sponsors" = (
                SELECT jsonb_agg(
                    sponsor - 'type'
                )
                FROM jsonb_array_elements("sponsors") AS sponsor
            )
            WHERE "sponsors" IS NOT NULL AND jsonb_array_length("sponsors") > 0
        `);
    }
} 