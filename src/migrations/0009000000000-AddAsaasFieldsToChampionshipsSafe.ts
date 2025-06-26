import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAsaasFieldsToChampionshipsSafe0010000000000 implements MigrationInterface {
  name = 'AddAsaasFieldsToChampionshipsSafe0010000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verifica e adiciona todos os campos para integração completa com Asaas
    
    const fieldsToAdd = [
      // Campos originais do Asaas
      {
        name: 'asaasCustomerId',
        column: new TableColumn({
          name: 'asaasCustomerId',
          type: 'varchar',
          length: '255',
          isNullable: true,
          comment: 'ID do cliente/subconta no Asaas'
        })
      },
      {
        name: 'asaasWalletId',
        column: new TableColumn({
          name: 'asaasWalletId',
          type: 'varchar',
          length: '255',
          isNullable: true,
          comment: 'ID da carteira (wallet) no Asaas para split payment'
        })
      },
      {
        name: 'platformCommissionPercentage',
        column: new TableColumn({
          name: 'platformCommissionPercentage',
          type: 'decimal',
          precision: 5,
          scale: 2,
          default: '10.00',
          comment: 'Percentual de comissão da plataforma BRK'
        })
      },
      {
        name: 'splitEnabled',
        column: new TableColumn({
          name: 'splitEnabled',
          type: 'boolean',
          default: true,
          comment: 'Indica se o split payment está habilitado'
        })
      },
      // Campos adicionais para o Asaas
      {
        name: 'province',
        column: new TableColumn({
          name: 'province',
          type: 'varchar',
          length: '100',
          isNullable: true,
          comment: 'Bairro do endereço'
        })
      },
      {
        name: 'incomeValue',
        column: new TableColumn({
          name: 'incomeValue',
          type: 'decimal',
          precision: 10,
          scale: 2,
          isNullable: true,
          comment: 'Faturamento/Renda mensal'
        })
      },
      // Campos do responsável
      {
        name: 'responsibleEmail',
        column: new TableColumn({
          name: 'responsibleEmail',
          type: 'varchar',
          length: '100',
          isNullable: true,
          comment: 'E-mail do responsável quando não é o organizador'
        })
      },
      {
        name: 'responsibleBirthDate',
        column: new TableColumn({
          name: 'responsibleBirthDate',
          type: 'date',
          isNullable: true,
          comment: 'Data de nascimento do responsável'
        })
      }
    ];

    // Adicionar campos
    for (const field of fieldsToAdd) {
      const hasColumn = await queryRunner.hasColumn('Championships', field.name);
      
      if (!hasColumn) {
        await queryRunner.addColumn('Championships', field.column);
      }
    }

    // Criar enum para companyType se não existir
    const hasEnum = await queryRunner.query(`
      SELECT 1 FROM pg_type WHERE typname = 'championships_companytype_enum'
    `);
    
    if (!hasEnum || hasEnum.length === 0) {
      await queryRunner.query(`
        CREATE TYPE "championships_companytype_enum" AS ENUM('MEI', 'LIMITED', 'INDIVIDUAL', 'ASSOCIATION')
      `);
    }

    // Adicionar campo companyType
    const hasCompanyType = await queryRunner.hasColumn('Championships', 'companyType');
    if (!hasCompanyType) {
      await queryRunner.addColumn('Championships', new TableColumn({
        name: 'companyType',
        type: 'enum',
        enum: ['MEI', 'LIMITED', 'INDIVIDUAL', 'ASSOCIATION'],
        enumName: 'championships_companytype_enum',
        isNullable: true,
        comment: 'Tipo de empresa para pessoa jurídica'
      }));
    }

    // Adicionar comentário ao campo fullAddress
    await queryRunner.query(`
      COMMENT ON COLUMN "Championships"."fullAddress" IS 'Endereço completo - rua, avenida ou logradouro'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove todos os campos adicionados
    const fieldsToRemove = [
      'responsibleBirthDate', 
      'responsibleEmail', 
      'incomeValue', 
      'companyType',
      'province', 
      'asaasCustomerId', 
      'asaasWalletId', 
      'platformCommissionPercentage', 
      'splitEnabled'
    ];
    
    for (const fieldName of fieldsToRemove) {
      const hasColumn = await queryRunner.hasColumn('Championships', fieldName);
      
      if (hasColumn) {
        await queryRunner.dropColumn('Championships', fieldName);
      }
    }

    // Remove enum se existir
    const hasEnum = await queryRunner.query(`
      SELECT 1 FROM pg_type WHERE typname = 'championships_companytype_enum'
    `);
    
    if (hasEnum && hasEnum.length > 0) {
      await queryRunner.query(`DROP TYPE "championships_companytype_enum"`);
    }
  }
} 