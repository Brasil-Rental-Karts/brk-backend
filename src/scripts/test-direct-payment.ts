import { AppDataSource } from '../config/database.config';
import { SeasonRegistrationService } from '../services/season-registration.service';

async function testDirectPayment() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    // Usar o ID fornecido como argumento ou o ID padrão
    const registrationId = process.argv[2] || '6922dd33-1ddd-404f-a26d-b899f7a77ee7';
    
    console.log('🧪 Teste: Inscrição com pagamento direto');
    console.log(`📋 Registration ID: ${registrationId}`);

    const registrationService = new SeasonRegistrationService();
    
    // Buscar a inscrição
    const registration = await registrationService.findById(registrationId);
    
    if (!registration) {
      console.log('❌ Inscrição não encontrada');
      return;
    }

    console.log('📋 Inscrição encontrada:', {
      id: registration.id,
      paymentStatus: registration.paymentStatus,
      paymentMethod: registration.paymentMethod,
      amount: registration.amount,
      status: registration.status
    });

    // Buscar dados de pagamento
    const payments = await registrationService.getPaymentData(registrationId);
    
    console.log('💰 Dados de pagamento:', payments);

    if (!payments || payments.length === 0) {
      console.log('❌ Nenhum pagamento encontrado');
      return;
    }

    console.log('📊 Resumo dos pagamentos:');
    payments.forEach((payment, index) => {
      console.log(`  ${index + 1}. ID: ${payment.id}`);
      console.log(`     Status: ${payment.status}`);
      console.log(`     BillingType: ${payment.billingType}`);
      console.log(`     Valor: ${payment.value}`);
      console.log(`     Parcela: ${payment.installmentNumber || 'N/A'}`);
      console.log(`     QR Code: ${payment.pixQrCode ? 'Disponível' : 'Não disponível'}`);
      console.log('');
    });

    // Verificar se há pagamento direto
    const directPayment = payments.find(p => p.status === 'DIRECT_PAYMENT' || p.billingType === 'ADMIN_DIRECT');
    if (directPayment) {
      console.log('✅ Pagamento direto encontrado na lista!');
    } else {
      console.log('❌ Pagamento direto NÃO encontrado na lista');
    }

    // Verificar se há pagamento isento
    const exemptPayment = payments.find(p => p.status === 'EXEMPT' || p.billingType === 'ADMIN_EXEMPT');
    if (exemptPayment) {
      console.log('✅ Pagamento isento encontrado na lista!');
    } else {
      console.log('❌ Pagamento isento NÃO encontrado na lista');
    }

    console.log('\n✅ Teste concluído');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

testDirectPayment(); 