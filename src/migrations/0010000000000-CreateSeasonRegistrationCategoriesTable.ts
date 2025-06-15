import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSeasonRegistrationCategoriesTable0010000000000 implements MigrationInterface {
    name = 'CreateSeasonRegistrationCategoriesTable0010000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create SeasonRegistrationCategories table
        await queryRunner.query(`
            CREATE TABLE "SeasonRegistrationCategories" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "registrationId" uuid NOT NULL, 
                "categoryId" uuid NOT NULL, 
                CONSTRAINT "PK_SeasonRegistrationCategories" PRIMARY KEY ("id")
            )
        `);
        
        // Add foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "SeasonRegistrationCategories" 
            ADD CONSTRAINT "FK_SeasonRegistrationCategories_SeasonRegistrations_registrationId" 
            FOREIGN KEY ("registrationId") 
            REFERENCES "SeasonRegistrations"("id") 
            ON DELETE CASCADE 
            ON UPDATE NO ACTION
        `);
        
        await queryRunner.query(`
            ALTER TABLE "SeasonRegistrationCategories" 
            ADD CONSTRAINT "FK_SeasonRegistrationCategories_Categories_categoryId" 
            FOREIGN KEY ("categoryId") 
            REFERENCES "Categories"("id") 
            ON DELETE CASCADE 
            ON UPDATE NO ACTION
        `);
        
        // Create unique index for registration/category combination
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_SeasonRegistrationCategories_registrationId_categoryId" 
            ON "SeasonRegistrationCategories" ("registrationId", "categoryId")
        `);
        
        // Create indexes for better query performance
        await queryRunner.query(`CREATE INDEX "IDX_SeasonRegistrationCategories_registrationId" ON "SeasonRegistrationCategories" ("registrationId")`);
        await queryRunner.query(`CREATE INDEX "IDX_SeasonRegistrationCategories_categoryId" ON "SeasonRegistrationCategories" ("categoryId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "SeasonRegistrationCategories" DROP CONSTRAINT "FK_SeasonRegistrationCategories_Categories_categoryId"`);
        await queryRunner.query(`ALTER TABLE "SeasonRegistrationCategories" DROP CONSTRAINT "FK_SeasonRegistrationCategories_SeasonRegistrations_registrationId"`);
        
        // Drop table
        await queryRunner.query(`DROP TABLE "SeasonRegistrationCategories"`);
    }
} 