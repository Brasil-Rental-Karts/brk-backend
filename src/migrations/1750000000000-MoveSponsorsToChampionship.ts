import { MigrationInterface, QueryRunner } from "typeorm";

export class MoveSponsorsToChampionship1750000000000 implements MigrationInterface {
    name = 'MoveSponsorsToChampionship1750000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Primeiro, vamos mover os dados de sponsors existentes do Season para Championship
        // Buscar todos os sponsors das seasons e agrupá-los por championshipId
        const seasonsWithSponsors = await queryRunner.query(`
            SELECT "championshipId", "sponsors" 
            FROM "Seasons" 
            WHERE "sponsors" IS NOT NULL AND "sponsors" != '[]'
        `);

        // Para cada championship, coletar todos os sponsors únicos de suas seasons
        const championshipSponsors = new Map();
        
        for (const season of seasonsWithSponsors) {
            const championshipId = season.championshipId;
            const sponsors = JSON.parse(season.sponsors);
            
            if (!championshipSponsors.has(championshipId)) {
                championshipSponsors.set(championshipId, new Map());
            }
            
            const champSponsors = championshipSponsors.get(championshipId);
            for (const sponsor of sponsors) {
                champSponsors.set(sponsor.id, sponsor);
            }
        }

        // Adicionar coluna sponsors ao Championship
        await queryRunner.query(`ALTER TABLE "Championships" ADD "sponsors" jsonb DEFAULT '[]'`);

        // Inserir os sponsors agrupados nos championships
        for (const [championshipId, sponsorsMap] of championshipSponsors.entries()) {
            const sponsorsArray = Array.from(sponsorsMap.values());
            await queryRunner.query(`
                UPDATE "Championships" 
                SET "sponsors" = $1 
                WHERE "id" = $2
            `, [JSON.stringify(sponsorsArray), championshipId]);
        }

        // Remover coluna sponsors do Season
        await queryRunner.query(`ALTER TABLE "Seasons" DROP COLUMN "sponsors"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Adicionar coluna sponsors de volta ao Season
        await queryRunner.query(`ALTER TABLE "Seasons" ADD "sponsors" jsonb DEFAULT '[]'`);

        // Buscar todos os championships com sponsors
        const championshipsWithSponsors = await queryRunner.query(`
            SELECT "id", "sponsors" 
            FROM "Championships" 
            WHERE "sponsors" IS NOT NULL AND "sponsors" != '[]'
        `);

        // Para cada championship, distribuir seus sponsors para todas as suas seasons
        for (const championship of championshipsWithSponsors) {
            const sponsors = JSON.parse(championship.sponsors);
            await queryRunner.query(`
                UPDATE "Seasons" 
                SET "sponsors" = $1 
                WHERE "championshipId" = $2
            `, [JSON.stringify(sponsors), championship.id]);
        }

        // Remover coluna sponsors do Championship
        await queryRunner.query(`ALTER TABLE "Championships" DROP COLUMN "sponsors"`);
    }
} 