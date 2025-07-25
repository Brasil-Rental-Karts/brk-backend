import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateLapTimesTable1760000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'lap_times',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'stageId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'categoryId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'batteryIndex',
            type: 'int',
            isNullable: false,
            default: 0,
          },
          {
            name: 'kartNumber',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'lapTimes',
            type: 'jsonb',
            isNullable: false,
            comment:
              'JSON array with lap times: [{"lap": 1, "time": "01:21.855", "timeMs": 81855}, ...]',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['userId'],
            referencedTableName: 'Users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['stageId'],
            referencedTableName: 'Stages',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['categoryId'],
            referencedTableName: 'Categories',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            name: 'IDX_LAP_TIMES_USER_STAGE',
            columnNames: ['userId', 'stageId', 'categoryId', 'batteryIndex'],
            isUnique: true,
          },
          {
            name: 'IDX_LAP_TIMES_STAGE',
            columnNames: ['stageId'],
          },
        ],
      }),
      true
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('lap_times');
  }
}
