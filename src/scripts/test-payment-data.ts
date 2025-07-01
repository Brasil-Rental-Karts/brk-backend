import { AppDataSource } from '../config/database.config';
import { SeasonRegistrationService } from '../services/season-registration.service';

async function testPaymentData() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const registrationService = new SeasonRegistrationService();

    // Teste 1: Inscrição administrativa (exempt)
    console.log('\n🧪 Teste 1: Inscrição administrativa (exempt)');
    const exemptRegistrationId = 'test-exempt-id'; // Substitua por um ID real
    try {
      const exemptPayments = await registrationService.getPaymentData(exemptRegistrationId);
      console.log('Resultado:', exemptPayments);
    } catch (error: any) {
      console.log('Erro:', error.message);
    }

    // Teste 2: Inscrição administrativa (direct_payment)
    console.log('\n🧪 Teste 2: Inscrição administrativa (direct_payment)');
    const directPaymentRegistrationId = 'test-direct-payment-id'; // Substitua por um ID real
    try {
      const directPayments = await registrationService.getPaymentData(directPaymentRegistrationId);
      console.log('Resultado:', directPayments);
    } catch (error: any) {
      console.log('Erro:', error.message);
    }

    // Teste 3: Inscrição com pagamentos Asaas
    console.log('\n🧪 Teste 3: Inscrição com pagamentos Asaas');
    const asaasRegistrationId = 'test-asaas-id'; // Substitua por um ID real
    try {
      const asaasPayments = await registrationService.getPaymentData(asaasRegistrationId);
      console.log('Resultado:', asaasPayments);
    } catch (error: any) {
      console.log('Erro:', error.message);
    }

    // Teste 4: Inscrição mista (administrativa + Asaas)
    console.log('\n🧪 Teste 4: Inscrição mista (administrativa + Asaas)');
    const mixedRegistrationId = 'test-mixed-id'; // Substitua por um ID real
    try {
      const mixedPayments = await registrationService.getPaymentData(mixedRegistrationId);
      console.log('Resultado:', mixedPayments);
    } catch (error: any) {
      console.log('Erro:', error.message);
    }

    console.log('\n✅ Testes concluídos');
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

testPaymentData(); 