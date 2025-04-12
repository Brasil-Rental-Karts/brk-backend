import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1744490423748 implements MigrationInterface {
    name = 'InitialMigration1744490423748'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "Organizers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "role" character varying(50), "certification" character varying(100), "user_id" uuid, CONSTRAINT "REL_a8e6f2dd4f2823013b3ac98edb" UNIQUE ("user_id"), CONSTRAINT "PK_10a74796b45f356c3c5a0b95679" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "Clubs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(100) NOT NULL, "foundationDate" date, "description" text, "logoUrl" character varying(255), CONSTRAINT "PK_174e8f05d412f7c978e45a3350e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "Championship" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(100) NOT NULL, "startDate" date, "endDate" date, "description" text, "rules" text, "club_id" uuid, CONSTRAINT "PK_1109abd68396cdd7b486ac54bf8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "Season" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(100), "year" integer NOT NULL, "startDate" date, "endDate" date, "status" character varying(20), "championship_id" uuid, CONSTRAINT "PK_f25bc04acf4e93b302153659a19" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "Appeals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "filingDate" TIMESTAMP, "description" text, "status" character varying(20), "resolution" text, "resolutionDate" TIMESTAMP, "penalty_id" uuid, "filed_by" uuid, CONSTRAINT "REL_aa8278cc5a30fdd9ccc532151e" UNIQUE ("penalty_id"), CONSTRAINT "PK_1cd71b669018fcaa39350191d7c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "Penalties" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "type" character varying(50), "description" text, "pointsDeducted" integer, "timePenalty" interval, "issuedBy" character varying(100), "result_id" uuid, CONSTRAINT "PK_788fb5aa36d14f04dc088649400" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "Results" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "position" integer, "lapTime" interval, "bestLap" interval, "points" integer, "disqualified" boolean NOT NULL DEFAULT false, "notes" text, "heat_id" uuid, "pilot_id" uuid, CONSTRAINT "PK_0101af08ba95ad7cc07b21a6084" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "Heats" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "number" integer, "startTime" TIME, "duration" integer, "maxParticipants" integer, "status" character varying(20), "stage_id" uuid, CONSTRAINT "PK_26043933487bf67cb4c4e185fac" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "Stages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(100), "date" date, "startTime" TIME, "status" character varying(20), "category_id" uuid, "venue_id" uuid, CONSTRAINT "PK_a2c139ab55410fd9a1fa224206a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "Categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(50) NOT NULL, "description" text, "minAge" integer, "maxAge" integer, "weightLimit" numeric(5,2), CONSTRAINT "PK_537b5c00afe7427c4fc9434cd59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "Pilots" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "licenseNumber" character varying(50), "experienceLevel" character varying(20), "dateOfBirth" date, "user_id" uuid, CONSTRAINT "UQ_f457ad8115246d55d0b39930e01" UNIQUE ("licenseNumber"), CONSTRAINT "REL_d9fe1eac03ccad81e3826a93cc" UNIQUE ("user_id"), CONSTRAINT "PK_13dcf500d0dc0b49134f91adc4c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "Users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(100) NOT NULL, "email" character varying(100) NOT NULL, "phone" character varying(20), "registrationDate" date NOT NULL, "active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_3c3ab3f49a87e6ddb607f3c4945" UNIQUE ("email"), CONSTRAINT "PK_16d4f7d636df336db11d87413e3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "Administrators" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "accessLevel" character varying(20), "department" character varying(50), "user_id" uuid, CONSTRAINT "REL_fca95750be07dd32958d43ac67" UNIQUE ("user_id"), CONSTRAINT "PK_91b880c032492d4e479d29f5cb3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "Karting_Tracks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(100) NOT NULL, "address" text, "contactInfo" character varying(100), "trackLength" numeric(8,2), "description" text, CONSTRAINT "PK_69340129a181551c429457ab7eb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "Fleet" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "kartModel" character varying(50), "quantity" integer, "engineType" character varying(50), "maintenanceDate" date, "venue_id" uuid, CONSTRAINT "PK_8b3b6372061c2e6c96a06c1837a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "Venues" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(100) NOT NULL, "address" text, "capacity" integer, "facilities" text, "track_id" uuid, CONSTRAINT "PK_b7b5f5bbb4304c640089072f7bc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "Club_Organizers" ("organizer_id" uuid NOT NULL, "club_id" uuid NOT NULL, CONSTRAINT "PK_144b3f0c112250d1e50fd596cd1" PRIMARY KEY ("organizer_id", "club_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7e17880a33427bc738a114d504" ON "Club_Organizers" ("organizer_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_8a02588d4e77c427eff5ea35ed" ON "Club_Organizers" ("club_id") `);
        await queryRunner.query(`CREATE TABLE "Season_Categories" ("season_id" uuid NOT NULL, "category_id" uuid NOT NULL, CONSTRAINT "PK_453e7a4fcf60ec0fea188a42beb" PRIMARY KEY ("season_id", "category_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_687be9f7fda6be770cdb2438ea" ON "Season_Categories" ("season_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_6a1d2c77ff13212ca77262143e" ON "Season_Categories" ("category_id") `);
        await queryRunner.query(`CREATE TABLE "Pilot_Categories" ("pilot_id" uuid NOT NULL, "category_id" uuid NOT NULL, CONSTRAINT "PK_fd3d3fda5d50f4c2754f0f51695" PRIMARY KEY ("pilot_id", "category_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3bb0f5d215dc11b4edbd11bd18" ON "Pilot_Categories" ("pilot_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_041744710f4e05646bbf1e4edf" ON "Pilot_Categories" ("category_id") `);
        await queryRunner.query(`CREATE TABLE "Track_Administrators" ("administrator_id" uuid NOT NULL, "track_id" uuid NOT NULL, CONSTRAINT "PK_c96f17fe448b10d1028326e4649" PRIMARY KEY ("administrator_id", "track_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8e4e186848ad8d58073f5d2380" ON "Track_Administrators" ("administrator_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_7054465d3c0711b6b2164f538c" ON "Track_Administrators" ("track_id") `);
        await queryRunner.query(`ALTER TABLE "Organizers" ADD CONSTRAINT "FK_a8e6f2dd4f2823013b3ac98edbc" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Championship" ADD CONSTRAINT "FK_e337e7af7b067996b1bc5c7080d" FOREIGN KEY ("club_id") REFERENCES "Clubs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Season" ADD CONSTRAINT "FK_b6fe9873313e5d52e52092c0749" FOREIGN KEY ("championship_id") REFERENCES "Championship"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Appeals" ADD CONSTRAINT "FK_aa8278cc5a30fdd9ccc532151ed" FOREIGN KEY ("penalty_id") REFERENCES "Penalties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Appeals" ADD CONSTRAINT "FK_f7d07579909debc8127371c1484" FOREIGN KEY ("filed_by") REFERENCES "Pilots"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Penalties" ADD CONSTRAINT "FK_99ee981480fa5f1eae5adeaff18" FOREIGN KEY ("result_id") REFERENCES "Results"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Results" ADD CONSTRAINT "FK_3d00f44d6998293a3e0195c6343" FOREIGN KEY ("heat_id") REFERENCES "Heats"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Results" ADD CONSTRAINT "FK_a817d6726a87d3c7dd536c18e34" FOREIGN KEY ("pilot_id") REFERENCES "Pilots"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Heats" ADD CONSTRAINT "FK_14ae13cc01ce769bcb326db9661" FOREIGN KEY ("stage_id") REFERENCES "Stages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Stages" ADD CONSTRAINT "FK_1fadaada4a73754a204a14382da" FOREIGN KEY ("category_id") REFERENCES "Categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Stages" ADD CONSTRAINT "FK_50e0f5e9b11a916ca4a7c57229e" FOREIGN KEY ("venue_id") REFERENCES "Venues"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Pilots" ADD CONSTRAINT "FK_d9fe1eac03ccad81e3826a93cc4" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Administrators" ADD CONSTRAINT "FK_fca95750be07dd32958d43ac674" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Fleet" ADD CONSTRAINT "FK_3b576f038a4ea02536e5f8e3f62" FOREIGN KEY ("venue_id") REFERENCES "Venues"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Venues" ADD CONSTRAINT "FK_32ebc49b349ccb920879987a87e" FOREIGN KEY ("track_id") REFERENCES "Karting_Tracks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "Club_Organizers" ADD CONSTRAINT "FK_7e17880a33427bc738a114d504d" FOREIGN KEY ("organizer_id") REFERENCES "Organizers"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "Club_Organizers" ADD CONSTRAINT "FK_8a02588d4e77c427eff5ea35ed3" FOREIGN KEY ("club_id") REFERENCES "Clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "Season_Categories" ADD CONSTRAINT "FK_687be9f7fda6be770cdb2438ea7" FOREIGN KEY ("season_id") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "Season_Categories" ADD CONSTRAINT "FK_6a1d2c77ff13212ca77262143e4" FOREIGN KEY ("category_id") REFERENCES "Categories"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "Pilot_Categories" ADD CONSTRAINT "FK_3bb0f5d215dc11b4edbd11bd18f" FOREIGN KEY ("pilot_id") REFERENCES "Pilots"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "Pilot_Categories" ADD CONSTRAINT "FK_041744710f4e05646bbf1e4edfe" FOREIGN KEY ("category_id") REFERENCES "Categories"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "Track_Administrators" ADD CONSTRAINT "FK_8e4e186848ad8d58073f5d2380d" FOREIGN KEY ("administrator_id") REFERENCES "Administrators"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "Track_Administrators" ADD CONSTRAINT "FK_7054465d3c0711b6b2164f538c1" FOREIGN KEY ("track_id") REFERENCES "Karting_Tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Track_Administrators" DROP CONSTRAINT "FK_7054465d3c0711b6b2164f538c1"`);
        await queryRunner.query(`ALTER TABLE "Track_Administrators" DROP CONSTRAINT "FK_8e4e186848ad8d58073f5d2380d"`);
        await queryRunner.query(`ALTER TABLE "Pilot_Categories" DROP CONSTRAINT "FK_041744710f4e05646bbf1e4edfe"`);
        await queryRunner.query(`ALTER TABLE "Pilot_Categories" DROP CONSTRAINT "FK_3bb0f5d215dc11b4edbd11bd18f"`);
        await queryRunner.query(`ALTER TABLE "Season_Categories" DROP CONSTRAINT "FK_6a1d2c77ff13212ca77262143e4"`);
        await queryRunner.query(`ALTER TABLE "Season_Categories" DROP CONSTRAINT "FK_687be9f7fda6be770cdb2438ea7"`);
        await queryRunner.query(`ALTER TABLE "Club_Organizers" DROP CONSTRAINT "FK_8a02588d4e77c427eff5ea35ed3"`);
        await queryRunner.query(`ALTER TABLE "Club_Organizers" DROP CONSTRAINT "FK_7e17880a33427bc738a114d504d"`);
        await queryRunner.query(`ALTER TABLE "Venues" DROP CONSTRAINT "FK_32ebc49b349ccb920879987a87e"`);
        await queryRunner.query(`ALTER TABLE "Fleet" DROP CONSTRAINT "FK_3b576f038a4ea02536e5f8e3f62"`);
        await queryRunner.query(`ALTER TABLE "Administrators" DROP CONSTRAINT "FK_fca95750be07dd32958d43ac674"`);
        await queryRunner.query(`ALTER TABLE "Pilots" DROP CONSTRAINT "FK_d9fe1eac03ccad81e3826a93cc4"`);
        await queryRunner.query(`ALTER TABLE "Stages" DROP CONSTRAINT "FK_50e0f5e9b11a916ca4a7c57229e"`);
        await queryRunner.query(`ALTER TABLE "Stages" DROP CONSTRAINT "FK_1fadaada4a73754a204a14382da"`);
        await queryRunner.query(`ALTER TABLE "Heats" DROP CONSTRAINT "FK_14ae13cc01ce769bcb326db9661"`);
        await queryRunner.query(`ALTER TABLE "Results" DROP CONSTRAINT "FK_a817d6726a87d3c7dd536c18e34"`);
        await queryRunner.query(`ALTER TABLE "Results" DROP CONSTRAINT "FK_3d00f44d6998293a3e0195c6343"`);
        await queryRunner.query(`ALTER TABLE "Penalties" DROP CONSTRAINT "FK_99ee981480fa5f1eae5adeaff18"`);
        await queryRunner.query(`ALTER TABLE "Appeals" DROP CONSTRAINT "FK_f7d07579909debc8127371c1484"`);
        await queryRunner.query(`ALTER TABLE "Appeals" DROP CONSTRAINT "FK_aa8278cc5a30fdd9ccc532151ed"`);
        await queryRunner.query(`ALTER TABLE "Season" DROP CONSTRAINT "FK_b6fe9873313e5d52e52092c0749"`);
        await queryRunner.query(`ALTER TABLE "Championship" DROP CONSTRAINT "FK_e337e7af7b067996b1bc5c7080d"`);
        await queryRunner.query(`ALTER TABLE "Organizers" DROP CONSTRAINT "FK_a8e6f2dd4f2823013b3ac98edbc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7054465d3c0711b6b2164f538c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8e4e186848ad8d58073f5d2380"`);
        await queryRunner.query(`DROP TABLE "Track_Administrators"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_041744710f4e05646bbf1e4edf"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3bb0f5d215dc11b4edbd11bd18"`);
        await queryRunner.query(`DROP TABLE "Pilot_Categories"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6a1d2c77ff13212ca77262143e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_687be9f7fda6be770cdb2438ea"`);
        await queryRunner.query(`DROP TABLE "Season_Categories"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8a02588d4e77c427eff5ea35ed"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7e17880a33427bc738a114d504"`);
        await queryRunner.query(`DROP TABLE "Club_Organizers"`);
        await queryRunner.query(`DROP TABLE "Venues"`);
        await queryRunner.query(`DROP TABLE "Fleet"`);
        await queryRunner.query(`DROP TABLE "Karting_Tracks"`);
        await queryRunner.query(`DROP TABLE "Administrators"`);
        await queryRunner.query(`DROP TABLE "Users"`);
        await queryRunner.query(`DROP TABLE "Pilots"`);
        await queryRunner.query(`DROP TABLE "Categories"`);
        await queryRunner.query(`DROP TABLE "Stages"`);
        await queryRunner.query(`DROP TABLE "Heats"`);
        await queryRunner.query(`DROP TABLE "Results"`);
        await queryRunner.query(`DROP TABLE "Penalties"`);
        await queryRunner.query(`DROP TABLE "Appeals"`);
        await queryRunner.query(`DROP TABLE "Season"`);
        await queryRunner.query(`DROP TABLE "Championship"`);
        await queryRunner.query(`DROP TABLE "Clubs"`);
        await queryRunner.query(`DROP TABLE "Organizers"`);
    }

}
