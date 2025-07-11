import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreatePenaltiesTable1766000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'penalties',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['disqualification', 'time_penalty', 'position_penalty', 'suspension', 'warning'],
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'applied', 'cancelled', 'appealed'],
            default: "'pending'",
          },
          {
            name: 'reason',
            type: 'text',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'timePenaltySeconds',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'positionPenalty',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'suspensionStages',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'suspensionUntil',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'championshipId',
            type: 'uuid',
          },
          {
            name: 'seasonId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'stageId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'categoryId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'appliedByUserId',
            type: 'uuid',
          },
          {
            name: 'appealReason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'appealedByUserId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Foreign Keys
    await queryRunner.createForeignKey(
      'penalties',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'Users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'penalties',
      new TableForeignKey({
        columnNames: ['championshipId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'Championships',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'penalties',
      new TableForeignKey({
        columnNames: ['seasonId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'Seasons',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'penalties',
      new TableForeignKey({
        columnNames: ['stageId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'Stages',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'penalties',
      new TableForeignKey({
        columnNames: ['categoryId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'Categories',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'penalties',
      new TableForeignKey({
        columnNames: ['appliedByUserId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'Users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'penalties',
      new TableForeignKey({
        columnNames: ['appealedByUserId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'Users',
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const table = await queryRunner.getTable('penalties');
    if (table) {
      const foreignKeys = table.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('penalties', foreignKey);
      }
    }

    await queryRunner.dropTable('penalties');
  }
} 