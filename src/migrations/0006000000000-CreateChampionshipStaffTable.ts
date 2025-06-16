import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateChampionshipStaffTable0006000000000 implements MigrationInterface {
    name = 'CreateChampionshipStaffTable0006000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create staff role enum
        await queryRunner.query(`CREATE TYPE "public"."ChampionshipStaff_role_enum" AS ENUM('staff')`);
        
        // Create ChampionshipStaff table
        await queryRunner.query(`
            CREATE TABLE "ChampionshipStaff" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "championshipId" uuid NOT NULL, 
                "userId" uuid NOT NULL, 
                "role" "public"."ChampionshipStaff_role_enum" NOT NULL DEFAULT 'staff', 
                "isActive" boolean NOT NULL DEFAULT true, 
                "addedById" uuid NOT NULL, 
                "addedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP, 
                "removedAt" TIMESTAMP WITH TIME ZONE, 
                CONSTRAINT "PK_ChampionshipStaff_id" PRIMARY KEY ("id")
            )
        `);

        // Create unique index for championshipId + userId
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ChampionshipStaff_championshipId_userId" ON "ChampionshipStaff" ("championshipId", "userId")`);

        // Create foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "ChampionshipStaff" 
            ADD CONSTRAINT "FK_ChampionshipStaff_championshipId" 
            FOREIGN KEY ("championshipId") REFERENCES "Championships"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "ChampionshipStaff" 
            ADD CONSTRAINT "FK_ChampionshipStaff_userId" 
            FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "ChampionshipStaff" 
            ADD CONSTRAINT "FK_ChampionshipStaff_addedById" 
            FOREIGN KEY ("addedById") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        // Create indexes for better performance
        await queryRunner.query(`CREATE INDEX "IDX_ChampionshipStaff_championshipId" ON "ChampionshipStaff" ("championshipId")`);
        await queryRunner.query(`CREATE INDEX "IDX_ChampionshipStaff_userId" ON "ChampionshipStaff" ("userId")`);
        await queryRunner.query(`CREATE INDEX "IDX_ChampionshipStaff_isActive" ON "ChampionshipStaff" ("isActive")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "ChampionshipStaff" DROP CONSTRAINT "FK_ChampionshipStaff_addedById"`);
        await queryRunner.query(`ALTER TABLE "ChampionshipStaff" DROP CONSTRAINT "FK_ChampionshipStaff_userId"`);
        await queryRunner.query(`ALTER TABLE "ChampionshipStaff" DROP CONSTRAINT "FK_ChampionshipStaff_championshipId"`);
        
        // Drop indexes
        await queryRunner.query(`DROP INDEX "public"."IDX_ChampionshipStaff_isActive"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ChampionshipStaff_userId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ChampionshipStaff_championshipId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ChampionshipStaff_championshipId_userId"`);
        
        // Drop table
        await queryRunner.query(`DROP TABLE "ChampionshipStaff"`);
        
        // Drop enum
        await queryRunner.query(`DROP TYPE "public"."ChampionshipStaff_role_enum"`);
    }
} 