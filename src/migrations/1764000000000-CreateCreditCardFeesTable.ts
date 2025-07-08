import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateCreditCardFeesTable1764000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "CreditCardFees",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        default: "gen_random_uuid()",
                    },
                    {
                        name: "championshipId",
                        type: "uuid",
                        isNullable: false,
                    },
                    {
                        name: "installmentRange",
                        type: "varchar",
                        length: "50",
                        isNullable: false,
                        comment: "Range de parcelas (ex: '1', '2-6', '7-12', '13-21')",
                    },
                    {
                        name: "percentageRate",
                        type: "decimal",
                        precision: 5,
                        scale: 2,
                        isNullable: false,
                        comment: "Taxa percentual (ex: 1.99, 2.49, 2.99, 3.29)",
                    },
                    {
                        name: "fixedFee",
                        type: "decimal",
                        precision: 10,
                        scale: 2,
                        isNullable: false,
                        default: "0.49",
                        comment: "Taxa fixa por transação",
                    },
                    {
                        name: "isActive",
                        type: "boolean",
                        isNullable: false,
                        default: true,
                    },
                    {
                        name: "description",
                        type: "varchar",
                        length: "255",
                        isNullable: true,
                        comment: "Descrição da faixa de parcelas",
                    },
                    {
                        name: "createdAt",
                        type: "timestamptz",
                        isNullable: false,
                        default: "CURRENT_TIMESTAMP",
                    },
                    {
                        name: "updatedAt",
                        type: "timestamptz",
                        isNullable: false,
                        default: "CURRENT_TIMESTAMP",
                    },
                ],
            }),
            true
        );

        // Criar índices
        await queryRunner.createIndex(
            "CreditCardFees",
            new TableIndex({
                name: "IDX_CREDIT_CARD_FEES_CHAMPIONSHIP",
                columnNames: ["championshipId"],
            })
        );

        await queryRunner.createIndex(
            "CreditCardFees",
            new TableIndex({
                name: "IDX_CREDIT_CARD_FEES_ACTIVE",
                columnNames: ["isActive"],
            })
        );

        // Inserir dados padrão para todos os campeonatos existentes
        await queryRunner.query(`
            INSERT INTO "CreditCardFees" ("championshipId", "installmentRange", "percentageRate", "fixedFee", "description")
            SELECT 
                c.id as "championshipId",
                '1' as "installmentRange",
                1.99 as "percentageRate",
                0.49 as "fixedFee",
                'À vista' as "description"
            FROM "Championships" c
            WHERE NOT EXISTS (
                SELECT 1 FROM "CreditCardFees" ccf 
                WHERE ccf."championshipId" = c.id AND ccf."installmentRange" = '1'
            )
        `);

        await queryRunner.query(`
            INSERT INTO "CreditCardFees" ("championshipId", "installmentRange", "percentageRate", "fixedFee", "description")
            SELECT 
                c.id as "championshipId",
                '2-6' as "installmentRange",
                2.49 as "percentageRate",
                0.49 as "fixedFee",
                '2 a 6 parcelas' as "description"
            FROM "Championships" c
            WHERE NOT EXISTS (
                SELECT 1 FROM "CreditCardFees" ccf 
                WHERE ccf."championshipId" = c.id AND ccf."installmentRange" = '2-6'
            )
        `);

        await queryRunner.query(`
            INSERT INTO "CreditCardFees" ("championshipId", "installmentRange", "percentageRate", "fixedFee", "description")
            SELECT 
                c.id as "championshipId",
                '7-12' as "installmentRange",
                2.99 as "percentageRate",
                0.49 as "fixedFee",
                '7 a 12 parcelas' as "description"
            FROM "Championships" c
            WHERE NOT EXISTS (
                SELECT 1 FROM "CreditCardFees" ccf 
                WHERE ccf."championshipId" = c.id AND ccf."installmentRange" = '7-12'
            )
        `);

        await queryRunner.query(`
            INSERT INTO "CreditCardFees" ("championshipId", "installmentRange", "percentageRate", "fixedFee", "description")
            SELECT 
                c.id as "championshipId",
                '13-21' as "installmentRange",
                3.29 as "percentageRate",
                0.49 as "fixedFee",
                '13 a 21 parcelas' as "description"
            FROM "Championships" c
            WHERE NOT EXISTS (
                SELECT 1 FROM "CreditCardFees" ccf 
                WHERE ccf."championshipId" = c.id AND ccf."installmentRange" = '13-21'
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("CreditCardFees");
    }
} 