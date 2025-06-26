import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCommissionAbsorptionField1751000000002 implements MigrationInterface {
  name = 'AddCommissionAbsorptionField1751000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar campo para controlar se a comissão é absorvida pelo campeonato
    await queryRunner.addColumn(
      'Championships',
      new TableColumn({
        name: 'commissionAbsorbedByChampionship',
        type: 'boolean',
        default: true,
        comment: 'Indica se a comissão da plataforma é absorvida pelo campeonato (true) ou cobrada do piloto (false)'
      })
    );

    console.log('✅ Campo commissionAbsorbedByChampionship adicionado à tabela Championships');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover campo
    const hasColumn = await queryRunner.hasColumn('Championships', 'commissionAbsorbedByChampionship');
    
    if (hasColumn) {
      await queryRunner.dropColumn('Championships', 'commissionAbsorbedByChampionship');
      console.log('✅ Campo commissionAbsorbedByChampionship removido da tabela Championships');
    }
  }
} 