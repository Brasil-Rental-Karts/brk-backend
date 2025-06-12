# Guia de Início Rápido - Integração Asaas

## Pré-requisitos

1. **Conta na Asaas**
   - Crie uma conta sandbox em: https://sandbox.asaas.com
   - Gere sua API Key em: **Configurações > Integração > API Key**

2. **Dependências**
   - Node.js (versão 18+)
   - PostgreSQL
   - Redis

## Instalação

### 1. Instalar Dependência

```bash
npm install axios
```

### 2. Configurar Variáveis de Ambiente

Adicione ao seu `.env`:

```env
# Asaas Configuration
ASAAS_API_URL=https://sandbox.asaas.com/api/v3
ASAAS_API_KEY=sua-api-key-sandbox
ASAAS_WEBHOOK_URL=https://seudominio.com/api/webhooks/asaas
```

### 3. Executar Migrations

```bash
npm run migration:run
```

### 4. Registrar Controladores

Adicione no seu `src/index.ts`:

```typescript
import { SeasonRegistrationService } from './services/season-registration.service';
import { SeasonRegistrationController } from './controllers/season-registration.controller';
import { AsaasWebhookController } from './controllers/asaas-webhook.controller';
import { AsaasService } from './services/asaas.service';

// Instanciar serviços
const asaasService = new AsaasService();
const seasonRegistrationService = new SeasonRegistrationService();

// Instanciar controladores
const seasonRegistrationController = new SeasonRegistrationController(seasonRegistrationService);
const asaasWebhookController = new AsaasWebhookController(seasonRegistrationService, asaasService);

// Registrar rotas
app.use('/api', seasonRegistrationController.router);
app.use('/api', asaasWebhookController.router);
```

### 5. Configurar Webhook na Asaas

1. Acesse: https://sandbox.asaas.com
2. Vá em **Configurações > Webhooks**
3. Clique em **Novo Webhook**
4. Configure:
   - **URL**: `https://seudominio.com/api/webhooks/asaas`
   - **Eventos**: Marque todos os eventos de pagamento
   - **Versão**: v3
5. Salve a configuração

## Teste Rápido

### 1. Criar uma Temporada

```bash
curl -X POST http://localhost:3000/api/seasons \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -d '{
    "name": "Temporada Teste 2025",
    "description": "Temporada para testes de pagamento",
    "startDate": "2025-03-01",
    "endDate": "2025-12-31",
    "inscriptionValue": 150.00,
    "inscriptionType": "anual",
    "paymentMethods": ["pix", "boleto"],
    "championshipId": "SEU_CHAMPIONSHIP_ID"
  }'
```

### 2. Criar uma Inscrição com Pagamento

```bash
curl -X POST http://localhost:3000/api/season-registrations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -d '{
    "seasonId": "UUID_DA_TEMPORADA",
    "paymentMethod": "pix",
    "userDocument": "12345678900"
  }'
```

### 3. Verificar Resposta

Você deve receber algo como:

```json
{
  "message": "Inscrição criada com sucesso",
  "data": {
    "registration": {
      "id": "uuid-da-inscricao",
      "status": "payment_pending",
      "paymentStatus": "pending",
      "amount": 150.00
    },
    "paymentData": {
      "billingType": "PIX",
      "pixQrCode": "data:image/png;base64,...",
      "pixCopyPaste": "00020126580014..."
    }
  }
}
```

## Testando Pagamentos

### No Ambiente Sandbox

1. **PIX**: Use o código copy/paste ou QR Code retornado
2. **Boleto**: Use a URL do boleto para simular pagamento
3. **Webhook**: Será disparado automaticamente

### Simular Pagamento (Sandbox)

```bash
# Simular pagamento recebido
curl -X POST https://sandbox.asaas.com/api/v3/payments/PAYMENT_ID/receiveInCash \
  -H "access_token: SUA_API_KEY" \
  -d '{"paymentDate": "2025-01-13", "value": 150.00}'
```

## Verificar Logs

```bash
# Ver logs da aplicação
tail -f logs/app.log

# Procurar por logs do Asaas
grep "ASAAS\|WEBHOOK" logs/app.log
```

## Comandos Úteis

### Verificar Status da Integração

```bash
# Testar conexão com Asaas
curl -X GET https://sandbox.asaas.com/api/v3/customers \
  -H "access_token: SUA_API_KEY" \
  | jq '.'
```

### Verificar Webhook

```bash
# Testar endpoint de webhook
curl -X POST http://localhost:3000/api/webhooks/asaas/test \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'
```

### Listar Inscrições

```bash
# Minhas inscrições
curl -X GET http://localhost:3000/api/season-registrations/my \
  -H "Authorization: Bearer SEU_JWT_TOKEN"
```

## Troubleshooting

### Erro: "ASAAS_API_KEY is required"
- Verifique se a variável está definida no `.env`
- Reinicie a aplicação após adicionar a variável

### Erro: "Temporada não encontrada"
- Certifique-se de que existe uma temporada criada
- Verifique o UUID da temporada

### Webhook não está sendo recebido
- Verifique se a URL do webhook está acessível publicamente
- Use ngrok para testes locais: `ngrok http 3000`
- Configure o webhook com a URL do ngrok

### Erro de conexão com Asaas
- Verifique se está usando a URL correta (sandbox vs produção)
- Confirme se a API Key está válida
- Teste a conectividade: `curl https://sandbox.asaas.com/api/v3/customers`

## Próximos Passos

1. **Produção**: Altere `ASAAS_API_URL` para `https://asaas.com/api/v3`
2. **SSL**: Configure HTTPS para receber webhooks
3. **Monitoramento**: Implemente alertas para falhas de pagamento
4. **Dashboard**: Crie interface para visualizar pagamentos

## Links Úteis

- [Documentação Asaas](https://docs.asaas.com)
- [Sandbox Asaas](https://sandbox.asaas.com)
- [Postman Collection](https://documenter.getpostman.com/view/10856135/T1LPBn7a)
- [Status da API Asaas](https://status.asaas.com)

---

**⚠️ Importante**: Nunca commite sua API Key real no código. Use sempre variáveis de ambiente. 