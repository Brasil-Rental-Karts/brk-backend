import { MigrationInterface, QueryRunner } from "typeorm";

export class Initial1744489982442 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enable UUID extension
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // Check if Users table exists
        const userTableExists = await queryRunner.hasTable("Users");
        if (!userTableExists) {
            // Create Users table (formerly Members)
            await queryRunner.query(`
                CREATE TABLE "Users" (
                    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                    "name" VARCHAR(100) NOT NULL,
                    "email" VARCHAR(100) UNIQUE NOT NULL,
                    "phone" VARCHAR(20),
                    "registrationDate" DATE NOT NULL,
                    "active" BOOLEAN DEFAULT TRUE,
                    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
                )
            `);
        }

        // Continue with other tables only if they don't exist
        
        if (!(await queryRunner.hasTable("Pilots"))) {
            // Create Pilots table
            await queryRunner.query(`
                CREATE TABLE "Pilots" (
                    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                    "user_id" uuid REFERENCES "Users"("id"),
                    "licenseNumber" VARCHAR(50) UNIQUE,
                    "experienceLevel" VARCHAR(20),
                    "dateOfBirth" DATE,
                    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
                )
            `);
        }

        if (!(await queryRunner.hasTable("Organizers"))) {
            // Create Organizers table
            await queryRunner.query(`
                CREATE TABLE "Organizers" (
                    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                    "user_id" uuid REFERENCES "Users"("id"),
                    "role" VARCHAR(50),
                    "certification" VARCHAR(100),
                    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
                )
            `);
        }

        if (!(await queryRunner.hasTable("Administrators"))) {
            // Create Administrators table
            await queryRunner.query(`
                CREATE TABLE "Administrators" (
                    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                    "user_id" uuid REFERENCES "Users"("id"),
                    "accessLevel" VARCHAR(20),
                    "department" VARCHAR(50),
                    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
                )
            `);
        }

        if (!(await queryRunner.hasTable("Clubs"))) {
            // Create Clubs table
            await queryRunner.query(`
                CREATE TABLE "Clubs" (
                    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                    "name" VARCHAR(100) NOT NULL,
                    "foundationDate" DATE,
                    "description" TEXT,
                    "logoUrl" VARCHAR(255),
                    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
                )
            `);
        }

        if (!(await queryRunner.hasTable("Club_Organizers"))) {
            // Create Club_Organizers junction table
            await queryRunner.query(`
                CREATE TABLE "Club_Organizers" (
                    "club_id" uuid REFERENCES "Clubs"("id") ON DELETE CASCADE,
                    "organizer_id" uuid REFERENCES "Organizers"("id") ON DELETE CASCADE,
                    PRIMARY KEY ("club_id", "organizer_id")
                )
            `);
        }

        if (!(await queryRunner.hasTable("Karting_Tracks"))) {
            // Create Karting_Tracks table
            await queryRunner.query(`
                CREATE TABLE "Karting_Tracks" (
                    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                    "name" VARCHAR(100) NOT NULL,
                    "address" TEXT,
                    "contactInfo" VARCHAR(100),
                    "trackLength" NUMERIC(8,2),
                    "description" TEXT,
                    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
                )
            `);
        }

        if (!(await queryRunner.hasTable("Track_Administrators"))) {
            // Create Track_Administrators junction table
            await queryRunner.query(`
                CREATE TABLE "Track_Administrators" (
                    "track_id" uuid REFERENCES "Karting_Tracks"("id") ON DELETE CASCADE,
                    "administrator_id" uuid REFERENCES "Administrators"("id") ON DELETE CASCADE,
                    PRIMARY KEY ("track_id", "administrator_id")
                )
            `);
        }

        if (!(await queryRunner.hasTable("Championship"))) {
            // Create Championship table
            await queryRunner.query(`
                CREATE TABLE "Championship" (
                    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                    "name" VARCHAR(100) NOT NULL,
                    "club_id" uuid REFERENCES "Clubs"("id"),
                    "startDate" DATE,
                    "endDate" DATE,
                    "description" TEXT,
                    "rules" TEXT,
                    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
                )
            `);
        }

        if (!(await queryRunner.hasTable("Season"))) {
            // Create Season table
            await queryRunner.query(`
                CREATE TABLE "Season" (
                    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                    "championship_id" uuid REFERENCES "Championship"("id"),
                    "name" VARCHAR(100),
                    "year" INTEGER NOT NULL,
                    "startDate" DATE,
                    "endDate" DATE,
                    "status" VARCHAR(20),
                    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
                )
            `);
        }

        if (!(await queryRunner.hasTable("Categories"))) {
            // Create Categories table
            await queryRunner.query(`
                CREATE TABLE "Categories" (
                    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                    "name" VARCHAR(50) NOT NULL,
                    "description" TEXT,
                    "minAge" INTEGER,
                    "maxAge" INTEGER,
                    "weightLimit" NUMERIC(5,2),
                    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
                )
            `);
        }

        if (!(await queryRunner.hasTable("Season_Categories"))) {
            // Create Season_Categories junction table
            await queryRunner.query(`
                CREATE TABLE "Season_Categories" (
                    "season_id" uuid REFERENCES "Season"("id") ON DELETE CASCADE,
                    "category_id" uuid REFERENCES "Categories"("id") ON DELETE CASCADE,
                    PRIMARY KEY ("season_id", "category_id")
                )
            `);
        }

        if (!(await queryRunner.hasTable("Pilot_Categories"))) {
            // Create Pilot_Categories junction table
            await queryRunner.query(`
                CREATE TABLE "Pilot_Categories" (
                    "pilot_id" uuid REFERENCES "Pilots"("id") ON DELETE CASCADE,
                    "category_id" uuid REFERENCES "Categories"("id") ON DELETE CASCADE,
                    PRIMARY KEY ("pilot_id", "category_id")
                )
            `);
        }

        if (!(await queryRunner.hasTable("Venues"))) {
            // Create Venues table
            await queryRunner.query(`
                CREATE TABLE "Venues" (
                    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                    "name" VARCHAR(100) NOT NULL,
                    "track_id" uuid REFERENCES "Karting_Tracks"("id"),
                    "address" TEXT,
                    "capacity" INTEGER,
                    "facilities" TEXT,
                    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
                )
            `);
        }

        if (!(await queryRunner.hasTable("Stages"))) {
            // Create Stages table
            await queryRunner.query(`
                CREATE TABLE "Stages" (
                    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                    "name" VARCHAR(100),
                    "category_id" uuid REFERENCES "Categories"("id"),
                    "venue_id" uuid REFERENCES "Venues"("id"),
                    "date" DATE,
                    "startTime" TIME,
                    "status" VARCHAR(20),
                    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
                )
            `);
        }

        if (!(await queryRunner.hasTable("Fleet"))) {
            // Create Fleet table
            await queryRunner.query(`
                CREATE TABLE "Fleet" (
                    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                    "venue_id" uuid REFERENCES "Venues"("id"),
                    "kartModel" VARCHAR(50),
                    "quantity" INTEGER,
                    "engineType" VARCHAR(50),
                    "maintenanceDate" DATE,
                    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
                )
            `);
        }

        if (!(await queryRunner.hasTable("Heats"))) {
            // Create Heats table
            await queryRunner.query(`
                CREATE TABLE "Heats" (
                    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                    "stage_id" uuid REFERENCES "Stages"("id"),
                    "number" INTEGER,
                    "startTime" TIME,
                    "duration" INTEGER,
                    "maxParticipants" INTEGER,
                    "status" VARCHAR(20),
                    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
                )
            `);
        }

        if (!(await queryRunner.hasTable("Results"))) {
            // Create Results table
            await queryRunner.query(`
                CREATE TABLE "Results" (
                    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                    "heat_id" uuid REFERENCES "Heats"("id"),
                    "pilot_id" uuid REFERENCES "Pilots"("id"),
                    "position" INTEGER,
                    "lapTime" INTERVAL,
                    "bestLap" INTERVAL,
                    "points" INTEGER,
                    "disqualified" BOOLEAN DEFAULT FALSE,
                    "notes" TEXT,
                    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
                )
            `);
        }

        if (!(await queryRunner.hasTable("Penalties"))) {
            // Create Penalties table
            await queryRunner.query(`
                CREATE TABLE "Penalties" (
                    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                    "result_id" uuid REFERENCES "Results"("id"),
                    "type" VARCHAR(50),
                    "description" TEXT,
                    "pointsDeducted" INTEGER,
                    "timePenalty" INTERVAL,
                    "issuedBy" VARCHAR(100),
                    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
                )
            `);
        }

        if (!(await queryRunner.hasTable("Appeals"))) {
            // Create Appeals table
            await queryRunner.query(`
                CREATE TABLE "Appeals" (
                    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                    "penalty_id" uuid REFERENCES "Penalties"("id"),
                    "filed_by" uuid REFERENCES "Pilots"("id"),
                    "filingDate" TIMESTAMP,
                    "description" TEXT,
                    "status" VARCHAR(20),
                    "resolution" TEXT,
                    "resolutionDate" TIMESTAMP,
                    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
                )
            `);
        }

        // Create indices (if they don't exist)
        // We don't need to check for existence because CREATE INDEX IF NOT EXISTS is supported by PostgreSQL
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_pilots_user_id" ON "Pilots"("user_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_organizers_user_id" ON "Organizers"("user_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_administrators_user_id" ON "Administrators"("user_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_championship_club_id" ON "Championship"("club_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_season_championship_id" ON "Season"("championship_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_season_year" ON "Season"("year")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_stages_category_id" ON "Stages"("category_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_stages_venue_id" ON "Stages"("venue_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_stages_date" ON "Stages"("date")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_venues_track_id" ON "Venues"("track_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_fleet_venue_id" ON "Fleet"("venue_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_heats_stage_id" ON "Heats"("stage_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_heats_stage_number" ON "Heats"("stage_id", "number")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_results_heat_id" ON "Results"("heat_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_results_pilot_id" ON "Results"("pilot_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_results_heat_position" ON "Results"("heat_id", "position")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_results_pilot_heat" ON "Results"("pilot_id", "heat_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_penalties_result_id" ON "Penalties"("result_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_appeals_penalty_id" ON "Appeals"("penalty_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_appeals_filed_by" ON "Appeals"("filed_by")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop tables in reverse order (respecting foreign key constraints)
        await queryRunner.query(`DROP TABLE IF EXISTS "Appeals" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "Penalties" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "Results" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "Heats" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "Fleet" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "Stages" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "Venues" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "Pilot_Categories" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "Season_Categories" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "Categories" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "Season" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "Championship" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "Track_Administrators" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "Karting_Tracks" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "Club_Organizers" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "Clubs" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "Administrators" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "Organizers" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "Pilots" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "Users" CASCADE`);
    }

}
