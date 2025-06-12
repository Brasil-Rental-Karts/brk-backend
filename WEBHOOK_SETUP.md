# Configuração do Webhook Asaas

## Status Atual
✅ Webhook endpoint funcionando: `POST /webhooks/asaas`  
✅ Endpoint de teste disponível: `POST /webhooks/asaas/test`  
✅ URL corrigida no .env: `https://bfc2-187-75-70-119.ngrok-free.app/webhooks/asaas`

## Configuração no Painel Asaas

### 1. Acesse o painel do Asaas Sandbox
- URL: https://sandbox.asaas.com
- Faça login com suas credenciais

### 2. Configure o Webhook
1. Vá em **Configurações** → **Webhooks**
2. Clique em **Adicionar Webhook**
3. Configure:
   - **URL**: `https://bfc2-187-75-70-119.ngrok-free.app/webhooks/asaas`
   - **Eventos**: Selecione os eventos desejados:
     - `PAYMENT_CREATED`
     - `PAYMENT_RECEIVED`
     - `PAYMENT_CONFIRMED`
     - `PAYMENT_OVERDUE`
     - `PAYMENT_DELETED`
     - `PAYMENT_REFUNDED`
   - **Método**: POST
   - **Content-Type**: application/json

### 3. Teste o Webhook
Execute este comando para testar:
```bash
curl -X POST http://localhost:3000/webhooks/asaas/test
```

### 4. Verificar Logs
Os webhooks são logados no console do servidor. Procure por:
```
[WEBHOOK] Recebido webhook do Asaas: {...}
[WEBHOOK] Processado com sucesso: PAYMENT_RECEIVED para pagamento pay_123
```

## Eventos Suportados

| Evento | Descrição | Ação no Sistema |
|--------|-----------|-----------------|
| `PAYMENT_RECEIVED` | Pagamento recebido | Confirma inscrição |
| `PAYMENT_CONFIRMED` | Pagamento confirmado | Confirma inscrição |
| `PAYMENT_OVERDUE` | Pagamento vencido | Marca como expirado |
| `PAYMENT_DELETED` | Pagamento cancelado | Cancela inscrição |
| `PAYMENT_REFUNDED` | Pagamento estornado | Cancela inscrição |

## Troubleshooting

### Webhook retorna 404
- ✅ **Resolvido**: URL corrigida de `/asaas/webhook` para `/webhooks/asaas`

### Webhook não é processado
1. Verifique se o ngrok está rodando
2. Confirme se a URL no painel Asaas está correta
3. Verifique os logs do servidor

### Testar manualmente
```bash
# Teste básico
curl -X POST http://localhost:3000/webhooks/asaas/test

# Teste com payload
curl -X POST http://localhost:3000/webhooks/asaas \
  -H "Content-Type: application/json" \
  -d '{
    "event": "PAYMENT_RECEIVED",
    "payment": {
      "id": "pay_test123",
      "status": "RECEIVED",
      "value": 100.00,
      "paymentDate": "2025-06-12"
    }
  }'
```

## Próximos Passos

1. **Atualizar URL no painel Asaas** para: `https://bfc2-187-75-70-119.ngrok-free.app/webhooks/asaas`
2. **Testar fluxo completo**: Criar inscrição → Fazer pagamento → Verificar webhook
3. **Monitorar logs** para garantir que os webhooks estão sendo processados 