# Migração da Arquitetura Redis - BRK Backend

## Visão Geral da Nova Arquitetura

O Redis foi refatorado para servir **EXCLUSIVAMENTE** como canal de eventos de alterações no banco de dados PostgreSQL. A nova arquitetura garante que:

1. **PostgreSQL é a fonte única da verdade** - Todos os dados de negócio são lidos do PostgreSQL
2. **Redis é usado apenas para eventos** - Notifica outras aplicações sobre mudanças nos dados
3. **Dados de sessão (refresh tokens)** - Apropriados para armazenamento temporário no Redis
4. **Sem cache de dados** - Elimina problemas de inconsistência e invalidação

## Regras da Nova Arquitetura

### ✅ **PERMITIDO** - Use Redis para:
- **Eventos de alteração do banco de dados** - Notificar outras aplicações sobre mudanças
- **Dados de sessão temporários** - Refresh tokens, tokens de reset de senha temporários
- **Dados com TTL automático** - Informações que devem expirar automaticamente

### ❌ **PROIBIDO** - NÃO use Redis para:
- **Leitura de dados de negócio** - Sempre consulte o PostgreSQL
- **Cache de dados** - Dados devem vir diretamente do banco
- **Substituir consultas ao banco** - Todas as consultas devem ir ao PostgreSQL

## Configuração

### Tabelas Monitoradas (14 total):
- Championships
- Seasons  
- Categories
- Stages
- Users
- MemberProfiles
- SeasonRegistrations
- StageParticipations
- AsaasPayments
- ChampionshipStaff
- GridTypes
- ScoringSystems
- Regulations
- VipPreregisters

### Configuração Redis (`src/config/redis.config.ts`):
```typescript
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  trackedTables: [...],
  channelName: 'database_events',
  eventStorage: {
    defaultTTL: 86400, // 24 horas
    keyPrefix: 'event:'
  }
};
```

## Estrutura dos Eventos

```typescript
interface DatabaseChangeEvent {
  eventId: string;        // UUID único
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  data: any;             // Dados relevantes da alteração
  timestamp: string;     // ISO 8601
}
```

## Como Usar nos Services

### 1. Publicar Eventos de Alteração

**ANTES (❌ Incorreto):**
```typescript
// Não fazer mais - armazenar dados no Redis
await this.redisService.set(`championship:${id}`, championshipData);
```

**DEPOIS (✅ Correto):**
```typescript
// Publicar evento de alteração
await this.databaseEventsService.onEntityChange('UPDATE', 'Championship', {
  id: championship.id,
  name: championship.name,
  // ... outros campos relevantes
});
```

### 2. Leitura de Dados

**ANTES (❌ Incorreto):**
```typescript
// Não fazer - ler do Redis
const championship = await this.redisService.get(`championship:${id}`);
if (!championship) {
  championship = await this.championshipRepository.findById(id);
}
```

**DEPOIS (✅ Correto):**
```typescript
// Sempre ler do PostgreSQL
const championship = await this.championshipRepository.findById(id);
```

### 3. Dados de Sessão (Refresh Tokens)

**✅ CORRETO - Uso apropriado do Redis:**
```typescript
// Armazenar refresh token (dados de sessão temporários)
await this.redisService.storeSessionData(
  `refresh_token:${userId}`, 
  refreshToken, 
  7 * 24 * 60 * 60 // 7 dias TTL
);

// Recuperar refresh token para validação
const storedToken = await this.redisService.getSessionData(`refresh_token:${userId}`);

// Remover token no logout
await this.redisService.removeSessionData(`refresh_token:${userId}`);
```

## Implementação nos Services

### Exemplo: ChampionshipService

```typescript
export class ChampionshipService {
  private databaseEventsService = DatabaseChangeEventsService.getInstance();

  async updateChampionship(id: string, updateData: any): Promise<Championship> {
    // 1. Atualizar no PostgreSQL
    const championship = await this.championshipRepository.update(id, updateData);
    
    // 2. Publicar evento de alteração
    await this.databaseEventsService.onEntityChange('UPDATE', 'Championship', {
      id: championship.id,
      name: championship.name,
      slug: championship.slug,
      updatedAt: championship.updatedAt
    });
    
    return championship;
  }

  async getChampionshipById(id: string): Promise<Championship> {
    // Sempre ler do PostgreSQL - NUNCA do Redis
    return await this.championshipRepository.findById(id);
  }
}
```

## Consumo Externo dos Eventos

### Aplicações externas podem se conectar ao Redis para receber eventos:

```typescript
// Exemplo de consumo externo
const redis = new Redis({ host: 'localhost', port: 6379 });

redis.subscribe('database_events', (err, count) => {
  console.log(`Subscribed to ${count} channels`);
});

redis.on('message', (channel, message) => {
  const event = JSON.parse(message) as DatabaseChangeEvent;
  
  switch (event.table) {
    case 'Championship':
      handleChampionshipChange(event);
      break;
    case 'Season':
      handleSeasonChange(event);
      break;
    // ... outros casos
  }
});
```

## Benefícios da Nova Arquitetura

1. **Consistência de Dados** - PostgreSQL como fonte única da verdade
2. **Tempo Real** - Eventos imediatos para outras aplicações
3. **Simplicidade** - Sem complexidade de invalidação de cache
4. **Escalabilidade** - Múltiplas aplicações podem consumir os mesmos eventos
5. **Auditoria** - Histórico de todas as mudanças nos dados
6. **Flexibilidade** - Refresh tokens continuam no Redis (uso apropriado)

## Migração dos Services Existentes

### Services Já Migrados:
- ✅ **AuthService** - Eventos de User/MemberProfile + Refresh tokens no Redis
- ✅ **ChampionshipService** - Eventos de Championship
- ✅ **SeasonService** - Eventos de Season
- ✅ **StageService** - Eventos de Stage
- ✅ **CategoryService** - Eventos de Category
- ✅ **RegulationService** - Eventos de Regulation

### Padrão de Migração:
1. **Remover** todas as operações de leitura do Redis
2. **Substituir** consultas Redis por consultas PostgreSQL
3. **Adicionar** eventos de alteração após operações CUD
4. **Manter** dados de sessão no Redis (quando apropriado)

## Monitoramento

### Logs de Eventos:
```
📡 Published INSERT event for Championship (ID: uuid-123)
📡 Published UPDATE event for Season (ID: uuid-456)
🔑 Stored session data for key: refresh_token:user-789
```

### Health Check:
```typescript
const isRedisHealthy = await redisService.ping(); // true/false
const isConnected = redisService.isRedisConnected(); // true/false
```

---

Esta migração garante uma arquitetura mais robusta, consistente e escalável, onde o Redis serve exclusivamente como canal de comunicação entre aplicações, mantendo o PostgreSQL como a fonte confiável de todos os dados de negócio. 