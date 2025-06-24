import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateRegulationsTable1750000017000 implements MigrationInterface {
  name = 'CreateRegulationsTable1750000017000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create Regulations table
    await queryRunner.createTable(
      new Table({
        name: 'Regulations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['draft', 'published'],
            default: "'draft'",
            isNullable: false,
          },
          {
            name: 'publishedAt',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'seasonId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['seasonId'],
            referencedTableName: 'Seasons',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Create RegulationSections table
    await queryRunner.createTable(
      new Table({
        name: 'RegulationSections',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'markdownContent',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'order',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'regulationId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['regulationId'],
            referencedTableName: 'Regulations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Add indexes for better performance
    await queryRunner.query(`CREATE INDEX "IDX_Regulations_seasonId" ON "Regulations" ("seasonId")`);
    await queryRunner.query(`CREATE INDEX "IDX_RegulationSections_regulationId" ON "RegulationSections" ("regulationId")`);
    await queryRunner.query(`CREATE INDEX "IDX_RegulationSections_order" ON "RegulationSections" ("regulationId", "order")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_RegulationSections_order"`);
    await queryRunner.query(`DROP INDEX "IDX_RegulationSections_regulationId"`);
    await queryRunner.query(`DROP INDEX "IDX_Regulations_seasonId"`);

    // Drop tables
    await queryRunner.dropTable('RegulationSections');
    await queryRunner.dropTable('Regulations');
  }
} 