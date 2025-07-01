import { AppDataSource } from '../config/database.config';
import { SeasonRegistrationService } from '../services/season-registration.service';

async function testMixedPayment() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const registrationService = new SeasonRegistrationService();

    // Teste: Inscrição mista (administrativa + Asaas)
    console.log('\n🧪 Teste: Inscrição mista (administrativa + Asaas)');
    
    // Substitua por um ID real de uma inscrição mista
    const mixedRegistrationId = '6922dd33-1ddd-404f-a26d-b899f7a77ee7';
    
    try {
      // Buscar a inscrição primeiro
      const registration = await registrationService.findById(mixedRegistrationId);
      if (registration) {
        console.log('📋 Inscrição encontrada:', {
          id: registration.id,
          paymentStatus: registration.paymentStatus,
          paymentMethod: registration.paymentMethod,
          amount: registration.amount
        });
      }

      // Buscar dados de pagamento
      const payments = await registrationService.getPaymentData(mixedRegistrationId);
      console.log('💰 Dados de pagamento:', payments);
      
      if (payments && payments.length > 0) {
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
      } else {
        console.log('❌ Nenhum pagamento encontrado');
      }
    } catch (error: any) {
      console.log('❌ Erro:', error.message);
    }

    console.log('\n✅ Teste concluído');
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

testMixedPayment(); 