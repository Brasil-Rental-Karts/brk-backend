import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRegistrationOpenToSeasons1750400000000
  implements MigrationInterface
{
  name = 'AddRegistrationOpenToSeasons1750400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'Seasons',
      new TableColumn({
        name: 'registrationOpen',
        type: 'boolean',
        default: true,
        comment: 'Indica se as inscrições estão abertas para esta temporada',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('Seasons', 'registrationOpen');
  }
}
