import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateChampionshipsTableWithNewFields1750266373355
  implements MigrationInterface
{
  name = 'UpdateChampionshipsTableWithNewFields1750266373355';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "Stages" DROP CONSTRAINT "FK_Stages_Seasons_seasonId"`
    );
    await queryRunner.query(
      `ALTER TABLE "Championships" DROP CONSTRAINT "FK_Championships_Users_ownerId"`
    );
    await queryRunner.query(
      `ALTER TABLE "Categories" DROP CONSTRAINT "FK_Categories_Seasons_seasonId"`
    );
    await queryRunner.query(
      `ALTER TABLE "Seasons" DROP CONSTRAINT "FK_Seasons_Championships_championshipId"`
    );
    await queryRunner.query(
      `ALTER TABLE "StageParticipations" DROP CONSTRAINT "FK_StageParticipations_Users_userId"`
    );
    await queryRunner.query(
      `ALTER TABLE "StageParticipations" DROP CONSTRAINT "FK_StageParticipations_Stages_stageId"`
    );
    await queryRunner.query(
      `ALTER TABLE "StageParticipations" DROP CONSTRAINT "FK_StageParticipations_Categories_categoryId"`
    );
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrations" DROP CONSTRAINT "FK_SeasonRegistrations_userId"`
    );
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrations" DROP CONSTRAINT "FK_SeasonRegistrations_seasonId"`
    );
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrationCategories" DROP CONSTRAINT "FK_SeasonRegistrationCategories_SeasonRegistrations_registratio"`
    );
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrationCategories" DROP CONSTRAINT "FK_SeasonRegistrationCategories_Categories_categoryId"`
    );
    await queryRunner.query(
      `ALTER TABLE "ScoringSystem" DROP CONSTRAINT "FK_ScoringSystem_Championships_championshipId"`
    );
    await queryRunner.query(
      `ALTER TABLE "GridTypes" DROP CONSTRAINT "FK_GridTypes_championshipId"`
    );
    await queryRunner.query(
      `ALTER TABLE "ChampionshipStaff" DROP CONSTRAINT "FK_ChampionshipStaff_championshipId"`
    );
    await queryRunner.query(
      `ALTER TABLE "ChampionshipStaff" DROP CONSTRAINT "FK_ChampionshipStaff_userId"`
    );
    await queryRunner.query(
      `ALTER TABLE "ChampionshipStaff" DROP CONSTRAINT "FK_ChampionshipStaff_addedById"`
    );
    await queryRunner.query(
      `ALTER TABLE "AsaasPayments" DROP CONSTRAINT "FK_AsaasPayments_registrationId"`
    );
    await queryRunner.query(
      `ALTER TABLE "MemberProfiles" DROP CONSTRAINT "FK_MemberProfiles_Users_id"`
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_vip_preregister_email"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_vip_preregister_name"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_vip_preregister_createdAt"`
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_Users_email"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_Users_googleId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_Users_role"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_Users_active"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_Users_emailConfirmed"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_Stages_seasonId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_Stages_date"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_Stages_kartodrome"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_Stages_name"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_Championships_ownerId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_Championships_name"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_Championships_personType"`
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_Championships_state"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_Championships_city"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_Championships_document"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_Categories_seasonId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_Categories_name"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_Categories_ballast"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_Categories_maxPilots"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_Categories_minimumAge"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_Seasons_championshipId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_Seasons_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_Seasons_startDate"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_Seasons_endDate"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_Seasons_inscriptionType"`
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_Seasons_name"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_StageParticipations_userId_stageId_categoryId"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_StageParticipations_userId"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_StageParticipations_stageId"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_StageParticipations_categoryId"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_StageParticipations_status"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_SeasonRegistrations_user_season"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_SeasonRegistrations_userId"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_SeasonRegistrations_seasonId"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_SeasonRegistrations_status"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_SeasonRegistrations_paymentStatus"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_SeasonRegistrationCategories_registrationId_categoryId"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_SeasonRegistrationCategories_registrationId"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_SeasonRegistrationCategories_categoryId"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ScoringSystem_championshipId"`
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_ScoringSystem_name"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ScoringSystem_isActive"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ScoringSystem_isDefault"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_GridTypes_championshipId"`
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_GridTypes_type"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_GridTypes_isActive"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_GridTypes_isDefault"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_GridTypes_name"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ChampionshipStaff_championshipId_userId"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ChampionshipStaff_championshipId"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ChampionshipStaff_userId"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ChampionshipStaff_isActive"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_AsaasPayments_asaasPaymentId"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_AsaasPayments_registrationId"`
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_AsaasPayments_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_AsaasPayments_billingType"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_MemberProfiles_nickName"`
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_MemberProfiles_city"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_MemberProfiles_state"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_MemberProfiles_gender"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_MemberProfiles_experienceTime"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_MemberProfiles_competitiveLevel"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_MemberProfiles_hasOwnKart"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_MemberProfiles_isTeamMember"`
    );
    await queryRunner.query(
      `ALTER TABLE "GridTypes" DROP CONSTRAINT "GridTypes_type_check"`
    );
    await queryRunner.query(
      `ALTER TABLE "Categories" DROP CONSTRAINT "UQ_Categories_season_name"`
    );
    await queryRunner.query(
      `ALTER TABLE "GridTypes" DROP CONSTRAINT "UQ_GridTypes_championship_name"`
    );
    await queryRunner.query(
      `ALTER TABLE "Championships" DROP COLUMN IF EXISTS "rules"`
    );
    await queryRunner.query(`ALTER TABLE "Stages" DROP COLUMN "seasonId"`);
    await queryRunner.query(
      `ALTER TABLE "Stages" ADD "seasonId" character varying NOT NULL`
    );
    await queryRunner.query(`COMMENT ON COLUMN "Stages"."categoryIds" IS NULL`);
    await queryRunner.query(
      `ALTER TABLE "Championships" ALTER COLUMN "championshipImage" SET NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "Championships" ALTER COLUMN "shortDescription" SET NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "Championships" ALTER COLUMN "fullDescription" SET NOT NULL`
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "Championships"."fullAddress" IS NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "Championships" ALTER COLUMN "province" SET NOT NULL`
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "Championships"."province" IS NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "Championships" ALTER COLUMN "responsiblePhone" SET NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "Championships" ALTER COLUMN "responsibleEmail" SET NOT NULL`
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "Championships"."responsibleEmail" IS NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "Championships" ALTER COLUMN "responsibleBirthDate" SET NOT NULL`
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "Championships"."responsibleBirthDate" IS NULL`
    );
    await queryRunner.query(
      `ALTER TYPE "public"."championships_companytype_enum" RENAME TO "championships_companytype_enum_old"`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."Championships_companytype_enum" AS ENUM('MEI', 'LIMITED', 'INDIVIDUAL', 'ASSOCIATION')`
    );
    await queryRunner.query(
      `ALTER TABLE "Championships" ALTER COLUMN "companyType" TYPE "public"."Championships_companytype_enum" USING "companyType"::"text"::"public"."Championships_companytype_enum"`
    );
    await queryRunner.query(
      `DROP TYPE "public"."championships_companytype_enum_old"`
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "Championships"."companyType" IS NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "Championships" ALTER COLUMN "incomeValue" SET NOT NULL`
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "Championships"."incomeValue" IS NULL`
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "Championships"."asaasCustomerId" IS NULL`
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "Championships"."asaasWalletId" IS NULL`
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "Championships"."platformCommissionPercentage" IS NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "Championships" ALTER COLUMN "platformCommissionPercentage" SET DEFAULT '10'`
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "Championships"."splitEnabled" IS NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "Championships" DROP COLUMN "ownerId"`
    );
    await queryRunner.query(
      `ALTER TABLE "Championships" ADD "ownerId" character varying NOT NULL`
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "Categories"."batteriesConfig" IS NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "Categories" ALTER COLUMN "batteriesConfig" DROP DEFAULT`
    );
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrations" DROP COLUMN "createdAt"`
    );
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrations" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`
    );
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrations" DROP COLUMN "updatedAt"`
    );
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrations" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`
    );
    await queryRunner.query(`ALTER TABLE "GridTypes" DROP COLUMN "type"`);
    await queryRunner.query(
      `CREATE TYPE "public"."GridTypes_type_enum" AS ENUM('super_pole', 'inverted', 'inverted_partial', 'qualifying_session')`
    );
    await queryRunner.query(
      `ALTER TABLE "GridTypes" ADD "type" "public"."GridTypes_type_enum" NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "GridTypes" DROP COLUMN "championshipId"`
    );
    await queryRunner.query(
      `ALTER TABLE "GridTypes" ADD "championshipId" character varying NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "ChampionshipStaff" ALTER COLUMN "addedAt" SET DEFAULT now()`
    );
    await queryRunner.query(
      `ALTER TABLE "AsaasPayments" DROP COLUMN "createdAt"`
    );
    await queryRunner.query(
      `ALTER TABLE "AsaasPayments" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`
    );
    await queryRunner.query(
      `ALTER TABLE "AsaasPayments" DROP COLUMN "updatedAt"`
    );
    await queryRunner.query(
      `ALTER TABLE "AsaasPayments" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`
    );
    await queryRunner.query(
      `ALTER TABLE "AsaasPayments" ADD CONSTRAINT "UQ_220c82bf7e2764042531a9e1a12" UNIQUE ("registrationId")`
    );
    await queryRunner.query(
      `ALTER TABLE "MemberProfiles" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_94e52582ef37237777fc4aa882" ON "StageParticipations" ("userId", "stageId", "categoryId") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_80e400d12829f5e695cdbbf085" ON "SeasonRegistrations" ("userId", "seasonId") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_8d686f859227e393d5dff0bd28" ON "SeasonRegistrationCategories" ("registrationId", "categoryId") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_edfcf6615aa68a2716e4b7496e" ON "ChampionshipStaff" ("championshipId", "userId") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_bd3f2488461dfaf5cb8aad93cd" ON "AsaasPayments" ("asaasPaymentId") `
    );
    await queryRunner.query(
      `ALTER TABLE "Categories" ADD CONSTRAINT "FK_392e9e190d7ae82c243c3ada455" FOREIGN KEY ("seasonId") REFERENCES "Seasons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "Seasons" ADD CONSTRAINT "FK_9d2c2e089aa995e90a3920cd39a" FOREIGN KEY ("championshipId") REFERENCES "Championships"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "StageParticipations" ADD CONSTRAINT "FK_13c75c94206609873070f5039b9" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "StageParticipations" ADD CONSTRAINT "FK_403904f5ff07cc853cb4bc8a5f8" FOREIGN KEY ("stageId") REFERENCES "Stages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "StageParticipations" ADD CONSTRAINT "FK_3efddcc0132c8a7f8cbeb8578a5" FOREIGN KEY ("categoryId") REFERENCES "Categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrations" ADD CONSTRAINT "FK_6869f030f214fd82c35034c7420" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrations" ADD CONSTRAINT "FK_b1cb147b93bd394bd180543701d" FOREIGN KEY ("seasonId") REFERENCES "Seasons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrationCategories" ADD CONSTRAINT "FK_fddb07c89becd41de1d17dd4703" FOREIGN KEY ("registrationId") REFERENCES "SeasonRegistrations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrationCategories" ADD CONSTRAINT "FK_f84ca6734bde0009d553fdecd46" FOREIGN KEY ("categoryId") REFERENCES "Categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "ScoringSystem" ADD CONSTRAINT "FK_01db70e8ca0585908e3cd622384" FOREIGN KEY ("championshipId") REFERENCES "Championships"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "ChampionshipStaff" ADD CONSTRAINT "FK_9c0d7bbfa635c4a2e13c7f56b56" FOREIGN KEY ("championshipId") REFERENCES "Championships"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "ChampionshipStaff" ADD CONSTRAINT "FK_c80d5bbfdef02800770360d8b97" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "ChampionshipStaff" ADD CONSTRAINT "FK_3a3294c1b7d281cf3dfb523950c" FOREIGN KEY ("addedById") REFERENCES "Users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "AsaasPayments" ADD CONSTRAINT "FK_220c82bf7e2764042531a9e1a12" FOREIGN KEY ("registrationId") REFERENCES "SeasonRegistrations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "MemberProfiles" ADD CONSTRAINT "FK_b812d4719752f67b1f1727ef700" FOREIGN KEY ("id") REFERENCES "Users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "MemberProfiles" DROP CONSTRAINT "FK_b812d4719752f67b1f1727ef700"`
    );
    await queryRunner.query(
      `ALTER TABLE "AsaasPayments" DROP CONSTRAINT "FK_220c82bf7e2764042531a9e1a12"`
    );
    await queryRunner.query(
      `ALTER TABLE "ChampionshipStaff" DROP CONSTRAINT "FK_3a3294c1b7d281cf3dfb523950c"`
    );
    await queryRunner.query(
      `ALTER TABLE "ChampionshipStaff" DROP CONSTRAINT "FK_c80d5bbfdef02800770360d8b97"`
    );
    await queryRunner.query(
      `ALTER TABLE "ChampionshipStaff" DROP CONSTRAINT "FK_9c0d7bbfa635c4a2e13c7f56b56"`
    );
    await queryRunner.query(
      `ALTER TABLE "ScoringSystem" DROP CONSTRAINT "FK_01db70e8ca0585908e3cd622384"`
    );
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrationCategories" DROP CONSTRAINT "FK_f84ca6734bde0009d553fdecd46"`
    );
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrationCategories" DROP CONSTRAINT "FK_fddb07c89becd41de1d17dd4703"`
    );
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrations" DROP CONSTRAINT "FK_b1cb147b93bd394bd180543701d"`
    );
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrations" DROP CONSTRAINT "FK_6869f030f214fd82c35034c7420"`
    );
    await queryRunner.query(
      `ALTER TABLE "StageParticipations" DROP CONSTRAINT "FK_3efddcc0132c8a7f8cbeb8578a5"`
    );
    await queryRunner.query(
      `ALTER TABLE "StageParticipations" DROP CONSTRAINT "FK_403904f5ff07cc853cb4bc8a5f8"`
    );
    await queryRunner.query(
      `ALTER TABLE "StageParticipations" DROP CONSTRAINT "FK_13c75c94206609873070f5039b9"`
    );
    await queryRunner.query(
      `ALTER TABLE "Seasons" DROP CONSTRAINT "FK_9d2c2e089aa995e90a3920cd39a"`
    );
    await queryRunner.query(
      `ALTER TABLE "Categories" DROP CONSTRAINT "FK_392e9e190d7ae82c243c3ada455"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bd3f2488461dfaf5cb8aad93cd"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_edfcf6615aa68a2716e4b7496e"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8d686f859227e393d5dff0bd28"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_80e400d12829f5e695cdbbf085"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_94e52582ef37237777fc4aa882"`
    );
    await queryRunner.query(
      `ALTER TABLE "MemberProfiles" ALTER COLUMN "id" DROP DEFAULT`
    );
    await queryRunner.query(
      `ALTER TABLE "AsaasPayments" DROP CONSTRAINT "UQ_220c82bf7e2764042531a9e1a12"`
    );
    await queryRunner.query(
      `ALTER TABLE "AsaasPayments" DROP COLUMN "updatedAt"`
    );
    await queryRunner.query(
      `ALTER TABLE "AsaasPayments" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`
    );
    await queryRunner.query(
      `ALTER TABLE "AsaasPayments" DROP COLUMN "createdAt"`
    );
    await queryRunner.query(
      `ALTER TABLE "AsaasPayments" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`
    );
    await queryRunner.query(
      `ALTER TABLE "ChampionshipStaff" ALTER COLUMN "addedAt" SET DEFAULT CURRENT_TIMESTAMP`
    );
    await queryRunner.query(
      `ALTER TABLE "GridTypes" DROP COLUMN "championshipId"`
    );
    await queryRunner.query(
      `ALTER TABLE "GridTypes" ADD "championshipId" uuid NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE "GridTypes" DROP COLUMN "type"`);
    await queryRunner.query(`DROP TYPE "public"."GridTypes_type_enum"`);
    await queryRunner.query(
      `ALTER TABLE "GridTypes" ADD "type" character varying NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrations" DROP COLUMN "updatedAt"`
    );
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrations" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`
    );
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrations" DROP COLUMN "createdAt"`
    );
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrations" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`
    );
    await queryRunner.query(
      `ALTER TABLE "Categories" ALTER COLUMN "batteriesConfig" SET DEFAULT '[]'`
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "Categories"."batteriesConfig" IS 'Configuração das baterias em formato JSON'`
    );
    await queryRunner.query(
      `ALTER TABLE "Championships" DROP COLUMN "ownerId"`
    );
    await queryRunner.query(
      `ALTER TABLE "Championships" ADD "ownerId" uuid NOT NULL`
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "Championships"."splitEnabled" IS 'Indica se o split payment está habilitado'`
    );
    await queryRunner.query(
      `ALTER TABLE "Championships" ALTER COLUMN "platformCommissionPercentage" SET DEFAULT 10.00`
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "Championships"."platformCommissionPercentage" IS 'Percentual de comissão da plataforma BRK'`
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "Championships"."asaasWalletId" IS 'ID da carteira (wallet) no Asaas para split payment'`
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "Championships"."asaasCustomerId" IS 'ID do cliente/subconta no Asaas'`
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "Championships"."incomeValue" IS 'Faturamento/Renda mensal'`
    );
    await queryRunner.query(
      `ALTER TABLE "Championships" ALTER COLUMN "incomeValue" DROP NOT NULL`
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "Championships"."companyType" IS 'Tipo de empresa para pessoa jurídica'`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."championships_companytype_enum_old" AS ENUM('MEI', 'LIMITED', 'INDIVIDUAL', 'ASSOCIATION')`
    );
    await queryRunner.query(
      `ALTER TABLE "Championships" ALTER COLUMN "companyType" TYPE "public"."championships_companytype_enum_old" USING "companyType"::"text"::"public"."championships_companytype_enum_old"`
    );
    await queryRunner.query(
      `DROP TYPE "public"."Championships_companytype_enum"`
    );
    await queryRunner.query(
      `ALTER TYPE "public"."championships_companytype_enum_old" RENAME TO "championships_companytype_enum"`
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "Championships"."responsibleBirthDate" IS 'Data de nascimento do responsável'`
    );
    await queryRunner.query(
      `ALTER TABLE "Championships" ALTER COLUMN "responsibleBirthDate" DROP NOT NULL`
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "Championships"."responsibleEmail" IS 'E-mail do responsável quando não é o organizador'`
    );
    await queryRunner.query(
      `ALTER TABLE "Championships" ALTER COLUMN "responsibleEmail" DROP NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "Championships" ALTER COLUMN "responsiblePhone" DROP NOT NULL`
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "Championships"."province" IS 'Bairro do endereço'`
    );
    await queryRunner.query(
      `ALTER TABLE "Championships" ALTER COLUMN "province" DROP NOT NULL`
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "Championships"."fullAddress" IS 'Endereço completo - rua, avenida ou logradouro'`
    );
    await queryRunner.query(
      `ALTER TABLE "Championships" ALTER COLUMN "fullDescription" DROP NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "Championships" ALTER COLUMN "shortDescription" DROP NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "Championships" ALTER COLUMN "championshipImage" DROP NOT NULL`
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "Stages"."categoryIds" IS 'Array de IDs das categorias participantes desta etapa'`
    );
    await queryRunner.query(`ALTER TABLE "Stages" DROP COLUMN "seasonId"`);
    await queryRunner.query(
      `ALTER TABLE "Stages" ADD "seasonId" uuid NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "Championships" DROP COLUMN IF EXISTS "rules"`
    );
    await queryRunner.query(
      `ALTER TABLE "GridTypes" ADD CONSTRAINT "UQ_GridTypes_championship_name" UNIQUE ("name", "championshipId")`
    );
    await queryRunner.query(
      `ALTER TABLE "Categories" ADD CONSTRAINT "UQ_Categories_season_name" UNIQUE ("name", "seasonId")`
    );
    await queryRunner.query(
      `ALTER TABLE "GridTypes" ADD CONSTRAINT "GridTypes_type_check" CHECK (((type)::text = ANY ((ARRAY['super_pole'::character varying, 'inverted'::character varying, 'inverted_partial'::character varying, 'qualifying_session'::character varying])::text[])))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_MemberProfiles_isTeamMember" ON "MemberProfiles" ("isTeamMember") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_MemberProfiles_hasOwnKart" ON "MemberProfiles" ("hasOwnKart") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_MemberProfiles_competitiveLevel" ON "MemberProfiles" ("competitiveLevel") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_MemberProfiles_experienceTime" ON "MemberProfiles" ("experienceTime") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_MemberProfiles_gender" ON "MemberProfiles" ("gender") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_MemberProfiles_state" ON "MemberProfiles" ("state") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_MemberProfiles_city" ON "MemberProfiles" ("city") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_MemberProfiles_nickName" ON "MemberProfiles" ("nickName") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_AsaasPayments_billingType" ON "AsaasPayments" ("billingType") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_AsaasPayments_status" ON "AsaasPayments" ("status") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_AsaasPayments_registrationId" ON "AsaasPayments" ("registrationId") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_AsaasPayments_asaasPaymentId" ON "AsaasPayments" ("asaasPaymentId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ChampionshipStaff_isActive" ON "ChampionshipStaff" ("isActive") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ChampionshipStaff_userId" ON "ChampionshipStaff" ("userId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ChampionshipStaff_championshipId" ON "ChampionshipStaff" ("championshipId") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ChampionshipStaff_championshipId_userId" ON "ChampionshipStaff" ("championshipId", "userId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_GridTypes_name" ON "GridTypes" ("name") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_GridTypes_isDefault" ON "GridTypes" ("isDefault") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_GridTypes_isActive" ON "GridTypes" ("isActive") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_GridTypes_type" ON "GridTypes" ("type") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_GridTypes_championshipId" ON "GridTypes" ("championshipId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ScoringSystem_isDefault" ON "ScoringSystem" ("isDefault") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ScoringSystem_isActive" ON "ScoringSystem" ("isActive") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ScoringSystem_name" ON "ScoringSystem" ("name") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ScoringSystem_championshipId" ON "ScoringSystem" ("championshipId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_SeasonRegistrationCategories_categoryId" ON "SeasonRegistrationCategories" ("categoryId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_SeasonRegistrationCategories_registrationId" ON "SeasonRegistrationCategories" ("registrationId") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_SeasonRegistrationCategories_registrationId_categoryId" ON "SeasonRegistrationCategories" ("registrationId", "categoryId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_SeasonRegistrations_paymentStatus" ON "SeasonRegistrations" ("paymentStatus") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_SeasonRegistrations_status" ON "SeasonRegistrations" ("status") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_SeasonRegistrations_seasonId" ON "SeasonRegistrations" ("seasonId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_SeasonRegistrations_userId" ON "SeasonRegistrations" ("userId") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_SeasonRegistrations_user_season" ON "SeasonRegistrations" ("userId", "seasonId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_StageParticipations_status" ON "StageParticipations" ("status") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_StageParticipations_categoryId" ON "StageParticipations" ("categoryId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_StageParticipations_stageId" ON "StageParticipations" ("stageId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_StageParticipations_userId" ON "StageParticipations" ("userId") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_StageParticipations_userId_stageId_categoryId" ON "StageParticipations" ("userId", "stageId", "categoryId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Seasons_name" ON "Seasons" ("name") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Seasons_inscriptionType" ON "Seasons" ("inscriptionType") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Seasons_endDate" ON "Seasons" ("endDate") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Seasons_startDate" ON "Seasons" ("startDate") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Seasons_status" ON "Seasons" ("status") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Seasons_championshipId" ON "Seasons" ("championshipId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Categories_minimumAge" ON "Categories" ("minimumAge") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Categories_maxPilots" ON "Categories" ("maxPilots") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Categories_ballast" ON "Categories" ("ballast") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Categories_name" ON "Categories" ("name") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Categories_seasonId" ON "Categories" ("seasonId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Championships_document" ON "Championships" ("document") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Championships_city" ON "Championships" ("city") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Championships_state" ON "Championships" ("state") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Championships_personType" ON "Championships" ("personType") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Championships_name" ON "Championships" ("name") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Championships_ownerId" ON "Championships" ("ownerId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Stages_name" ON "Stages" ("name") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Stages_kartodrome" ON "Stages" ("kartodrome") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Stages_date" ON "Stages" ("date") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Stages_seasonId" ON "Stages" ("seasonId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Users_emailConfirmed" ON "Users" ("emailConfirmed") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Users_active" ON "Users" ("active") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Users_role" ON "Users" ("role") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Users_googleId" ON "Users" ("googleId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_Users_email" ON "Users" ("email") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_vip_preregister_createdAt" ON "vip_preregister" ("createdAt") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_vip_preregister_name" ON "vip_preregister" ("name") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_vip_preregister_email" ON "vip_preregister" ("email") `
    );
    await queryRunner.query(
      `ALTER TABLE "MemberProfiles" ADD CONSTRAINT "FK_MemberProfiles_Users_id" FOREIGN KEY ("id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "AsaasPayments" ADD CONSTRAINT "FK_AsaasPayments_registrationId" FOREIGN KEY ("registrationId") REFERENCES "SeasonRegistrations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "ChampionshipStaff" ADD CONSTRAINT "FK_ChampionshipStaff_addedById" FOREIGN KEY ("addedById") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "ChampionshipStaff" ADD CONSTRAINT "FK_ChampionshipStaff_userId" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "ChampionshipStaff" ADD CONSTRAINT "FK_ChampionshipStaff_championshipId" FOREIGN KEY ("championshipId") REFERENCES "Championships"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "GridTypes" ADD CONSTRAINT "FK_GridTypes_championshipId" FOREIGN KEY ("championshipId") REFERENCES "Championships"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "ScoringSystem" ADD CONSTRAINT "FK_ScoringSystem_Championships_championshipId" FOREIGN KEY ("championshipId") REFERENCES "Championships"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrationCategories" ADD CONSTRAINT "FK_SeasonRegistrationCategories_Categories_categoryId" FOREIGN KEY ("categoryId") REFERENCES "Categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrationCategories" ADD CONSTRAINT "FK_SeasonRegistrationCategories_SeasonRegistrations_registratio" FOREIGN KEY ("registrationId") REFERENCES "SeasonRegistrations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrations" ADD CONSTRAINT "FK_SeasonRegistrations_seasonId" FOREIGN KEY ("seasonId") REFERENCES "Seasons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "SeasonRegistrations" ADD CONSTRAINT "FK_SeasonRegistrations_userId" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "StageParticipations" ADD CONSTRAINT "FK_StageParticipations_Categories_categoryId" FOREIGN KEY ("categoryId") REFERENCES "Categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "StageParticipations" ADD CONSTRAINT "FK_StageParticipations_Stages_stageId" FOREIGN KEY ("stageId") REFERENCES "Stages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "StageParticipations" ADD CONSTRAINT "FK_StageParticipations_Users_userId" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "Seasons" ADD CONSTRAINT "FK_Seasons_Championships_championshipId" FOREIGN KEY ("championshipId") REFERENCES "Championships"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "Categories" ADD CONSTRAINT "FK_Categories_Seasons_seasonId" FOREIGN KEY ("seasonId") REFERENCES "Seasons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "Championships" ADD CONSTRAINT "FK_Championships_Users_ownerId" FOREIGN KEY ("ownerId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "Stages" ADD CONSTRAINT "FK_Stages_Seasons_seasonId" FOREIGN KEY ("seasonId") REFERENCES "Seasons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }
}
