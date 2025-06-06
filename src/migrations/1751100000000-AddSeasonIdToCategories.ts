import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSeasonIdToCategories1751100000000 implements MigrationInterface {
    name = 'AddSeasonIdToCategories1751100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add seasonId column to Categories table
        await queryRunner.query(`
            ALTER TABLE "Categories" 
            ADD COLUMN "seasonId" uuid NOT NULL
        `);
        
        // Add foreign key constraint for season
        await queryRunner.query(`
            ALTER TABLE "Categories" 
            ADD CONSTRAINT "FK_Categories_Seasons_seasonId" 
            FOREIGN KEY ("seasonId") 
            REFERENCES "Seasons"("id") 
            ON DELETE CASCADE 
            ON UPDATE NO ACTION
        `);
        
        // Create index for better query performance
        await queryRunner.query(`CREATE INDEX "IDX_Categories_seasonId" ON "Categories" ("seasonId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop index
        await queryRunner.query(`DROP INDEX "IDX_Categories_seasonId"`);
        
        // Drop foreign key constraint
        await queryRunner.query(`ALTER TABLE "Categories" DROP CONSTRAINT "FK_Categories_Seasons_seasonId"`);
        
        // Drop seasonId column
        await queryRunner.query(`ALTER TABLE "Categories" DROP COLUMN "seasonId"`);
    }
} 