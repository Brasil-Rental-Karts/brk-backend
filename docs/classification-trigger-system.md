# Sistema de Trigger Automático de Classificação

## Visão Geral

Este sistema implementa um mecanismo automático para detectar alterações no campo `stage_results` da tabela `stage` e recalcular automaticamente a classificação do campeonato, persistindo os resultados no Redis para alta performance.

## Arquitetura

### 1. Trigger Automático
- **Localização**: `brk-backend/src/services/stage.service.ts`
- **Método**: `updateStageResults()`
- **Funcionamento**: Detecta alterações no campo `stage_results` e dispara automaticamente o recálculo

### 2. Processamento de Classificação
- **Localização**: `brk-backend/src/services/championship-classification.service.ts`
- **Métodos principais**:
  - `recalculateSeasonClassification()`: Recalcula toda a classificação da temporada
  - `updateClassificationFromStageResults()`: Processa resultados de uma etapa específica
  - `cacheSeasonClassificationInRedis()`: Persiste dados no Redis

### 3. Persistência no Redis
- **Localização**: `brk-backend/src/services/redis.service.ts`
- **Hash**: `season:{seasonId}`
- **Campo**: `classification`
- **Formato**: JSON com dados completos da classificação

### 4. Frontend Otimizado
- **Localização**: `brk-frontend/src/components/championship/tabs/ClassificationTab.tsx`
- **Método**: `getSeasonClassificationFromRedis()` - Consome diretamente do Redis

## Fluxo de Execução

### 1. Detecção de Alteração
```typescript
// Em stage.service.ts
async updateStageResults(id: string, results: any): Promise<Stage> {
  const stage = await this.findById(id);
  stage.stage_results = results;
  const updatedStage = await this.stageRepository.save(stage);
  
  // TRIGGER AUTOMÁTICO
  await this.classificationService.recalculateSeasonClassification(stage.seasonId);
  await this.persistClassificationToRedis(stage.seasonId);
  
  return this.formatTimeFields(updatedStage);
}
```

### 2. Recálculo da Classificação
```typescript
// Em championship-classification.service.ts
async recalculateSeasonClassification(seasonId: string): Promise<void> {
  // 1. Limpar classificações existentes
  await this.classificationRepository.delete({ seasonId });
  
  // 2. Buscar todas as etapas com resultados
  const stages = await this.stageRepository.find({
    where: { seasonId },
    andWhere: 'stage.stage_results IS NOT NULL'
  });
  
  // 3. Processar cada etapa
  for (const stage of stages) {
    await this.updateClassificationFromStageResults(stage.id, mockResults);
  }
  
  // 4. Persistir no Redis
  await this.cacheSeasonClassificationInRedis(seasonId);
}
```

### 3. Persistência no Redis
```typescript
// Em redis.service.ts
async cacheSeasonClassification(seasonId: string, classificationData: any): Promise<boolean> {
  const seasonKey = `season:${seasonId}`;
  const classificationJson = JSON.stringify(classificationData);
  await this.client.hSet(seasonKey, 'classification', classificationJson);
  return true;
}
```

### 4. Consumo pelo Frontend
```typescript
// Em championship-classification.service.ts (frontend)
static async getSeasonClassificationFromRedis(seasonId: string): Promise<any> {
  const response = await api.get(
    `${ChampionshipClassificationService.BASE_URL}/season/${seasonId}/redis`
  );
  return response.data.data;
}
```

## Endpoints da API

### 1. Atualizar Resultados de Etapa
```
PATCH /stages/:id/stage-results
```
- **Trigger**: Dispara automaticamente o recálculo da classificação
- **Logs**: `🔄 [TRIGGER] Detecção de alteração em stage_results`

### 2. Buscar Classificação do Redis
```
GET /classification/season/:seasonId/redis
```
- **Performance**: Alta performance, dados diretos do Redis
- **Formato**: Dados raw do Redis sem processamento adicional

### 3. Buscar Classificação Otimizada
```
GET /classification/season/:seasonId/optimized
```
- **Performance**: Alta performance com enriquecimento de dados
- **Formato**: Dados processados e enriquecidos com informações de usuários

## Monitoramento e Logs

### Logs de Trigger
```
🔄 [TRIGGER] Detecção de alteração em stage_results para etapa {id}
✅ [TRIGGER] Classificação da temporada {seasonId} recalculada e persistida no Redis
❌ [TRIGGER] Erro ao recalcular classificação da temporada: {error}
```

### Logs de Cache
```
💾 [CACHE] Iniciando cache da classificação da temporada {seasonId}
📊 [CACHE] Encontradas {count} classificações para cache
✅ [CACHE] Classificação da temporada {seasonId} cacheada no Redis
```

### Logs de Classificação
```
🔍 [CLASSIFICATION] Buscando classificação otimizada para temporada {seasonId}
✅ [CLASSIFICATION] Dados encontrados no Redis para temporada {seasonId}
📊 [CLASSIFICATION] Retornando {categories} categorias com {pilots} pilotos
```

## Estrutura de Dados no Redis

### Hash: `season:{seasonId}`
```json
{
  "classification": {
    "lastUpdated": "2024-01-15T10:30:00Z",
    "totalCategories": 3,
    "totalPilots": 25,
    "classificationsByCategory": {
      "category-id-1": [
        {
          "totalPoints": 150,
          "totalStages": 5,
          "wins": 2,
          "podiums": 4,
          "polePositions": 1,
          "fastestLaps": 3,
          "bestPosition": 1,
          "averagePosition": 2.5,
          "user": {
            "id": "user-id-1",
            "name": "João Silva",
            "nickname": "Speed Racer"
          }
        }
      ]
    }
  }
}
```

**Nota**: Nomes e nicknames são automaticamente formatados em CamelCase antes de serem armazenados no Redis.

## Performance e Otimizações

### 1. Cache Redis
- **Tipo**: Hash Redis para máxima performance
- **TTL**: Sem expiração (dados persistentes)
- **Estrutura**: Otimizada para consultas rápidas

### 2. Processamento em Lote
- **Usuários**: Busca múltiplos usuários em pipeline Redis
- **Classificações**: Processamento em lote por categoria
- **Cache**: Invalidação seletiva de dados

### 3. Concorrência
- **Thread-safe**: Operações Redis são thread-safe
- **Atomicidade**: Operações de hash são atômicas
- **Fallback**: Sistema funciona mesmo com Redis indisponível

### 4. Otimizações de Segurança e Performance
- **Dados Sensíveis**: Email do usuário removido da estrutura JSON
- **Tamanho Reduzido**: Menor payload para transferência de dados
- **Privacidade**: Dados pessoais minimizados no cache público
- **Campos Essenciais**: Apenas dados necessários para exibição incluídos

#### Estrutura Otimizada do Usuário
```json
{
  "user": {
    "id": "user-id",
    "name": "João Silva",
    "nickname": "SpeedRacer",
    "profilePicture": "https://...",
    "active": true
  }
}
```

**Campos Removidos por Segurança:**
- ❌ `email`: Dados sensíveis não expostos no cache público
- ❌ `phone`: Informações pessoais protegidas
- ❌ `password`: Nunca incluído em cache
- ❌ `resetPasswordToken`: Dados de segurança protegidos

## Testes

### Script de Teste
```bash
# Executar script de teste
npm run test:classification-trigger
```

### Verificações Automáticas
1. **Trigger**: Verifica se alterações em `stage_results` disparam recálculo
2. **Redis**: Confirma persistência dos dados no Redis
3. **Frontend**: Valida consumo direto do Redis pelo frontend
4. **Performance**: Mede tempo de resposta das consultas

## Benefícios

### 1. Performance
- **Frontend**: Consultas diretas ao Redis (sub-milissegundos)
- **Backend**: Processamento otimizado em lote
- **Cache**: Eliminação de cálculos repetitivos

### 2. Consistência
- **Dados**: Sempre atualizados após alterações
- **Cache**: Invalidação automática quando necessário
- **Sincronização**: Dados consistentes entre backend e frontend

### 3. Escalabilidade
- **Redis**: Suporte a alta concorrência
- **Processamento**: Distribuído por temporada
- **Cache**: Redução de carga no banco de dados

### 4. Monitoramento
- **Logs**: Detalhados para diagnóstico
- **Métricas**: Performance e erros
- **Alertas**: Notificações em caso de falhas

## Troubleshooting

### Problemas Comuns

1. **Classificação não atualizada**
   - Verificar logs de trigger
   - Confirmar se `stage_results` foi alterado
   - Verificar se Redis está disponível

2. **Dados não encontrados no Redis**
   - Verificar se `cacheSeasonClassification` foi executado
   - Confirmar estrutura do hash Redis
   - Verificar logs de cache

3. **Performance lenta**
   - Verificar conectividade com Redis
   - Confirmar se dados estão no cache
   - Verificar logs de classificação

### Comandos de Diagnóstico

```bash
# Verificar dados no Redis
redis-cli HGETALL "season:{seasonId}"

# Verificar logs do sistema
tail -f logs/app.log | grep -E "TRIGGER|CACHE|CLASSIFICATION"

# Testar endpoint de classificação
curl -H "Authorization: Bearer {token}" \
  http://localhost:3000/classification/season/{seasonId}/redis
```

## Conclusão

O sistema implementado garante:
- ✅ **Trigger automático** para alterações em `stage_results`
- ✅ **Recálculo completo** da classificação da temporada
- ✅ **Persistência otimizada** no Redis
- ✅ **Consumo direto** pelo frontend
- ✅ **Alta performance** e escalabilidade
- ✅ **Monitoramento completo** com logs detalhados 