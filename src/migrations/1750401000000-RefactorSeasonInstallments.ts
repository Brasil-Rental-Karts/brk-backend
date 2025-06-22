import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RefactorSeasonInstallments1750401000000 implements MigrationInterface {
  name = 'RefactorSeasonInstallments1750401000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remover campos antigos de parcelamento
    await queryRunner.dropColumn('Seasons', 'allowInstallment');
    await queryRunner.dropColumn('Seasons', 'maxInstallments');
    await queryRunner.dropColumn('Seasons', 'interestRate');

    // Adicionar novos campos de parcelamento por método de pagamento
    await queryRunner.addColumn(
      'Seasons',
      new TableColumn({
        name: 'pixInstallments',
        type: 'int',
        default: 1,
        comment: 'Número máximo de parcelas para pagamento via PIX'
      })
    );

    await queryRunner.addColumn(
      'Seasons',
      new TableColumn({
        name: 'creditCardInstallments',
        type: 'int',
        default: 1,
        comment: 'Número máximo de parcelas para pagamento via cartão de crédito'
      })
    );

    await queryRunner.addColumn(
      'Seasons',
      new TableColumn({
        name: 'boletoInstallments',
        type: 'int',
        default: 1,
        comment: 'Número máximo de parcelas para pagamento via boleto'
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover novos campos
    await queryRunner.dropColumn('Seasons', 'pixInstallments');
    await queryRunner.dropColumn('Seasons', 'creditCardInstallments');
    await queryRunner.dropColumn('Seasons', 'boletoInstallments');

    // Restaurar campos antigos
    await queryRunner.addColumn(
      'Seasons',
      new TableColumn({
        name: 'allowInstallment',
        type: 'boolean',
        default: false
      })
    );

    await queryRunner.addColumn(
      'Seasons',
      new TableColumn({
        name: 'maxInstallments',
        type: 'int',
        isNullable: true
      })
    );

    await queryRunner.addColumn(
      'Seasons',
      new TableColumn({
        name: 'interestRate',
        type: 'decimal',
        precision: 5,
        scale: 2,
        isNullable: true
      })
    );
  }
} 