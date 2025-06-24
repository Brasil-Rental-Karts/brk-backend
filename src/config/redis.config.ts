import 'dotenv/config';

// Load environment variables

export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD && process.env.REDIS_PASSWORD.trim() !== '' ? process.env.REDIS_PASSWORD : undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  
  // IMPORTANTE: Redis é usado EXCLUSIVAMENTE para armazenar eventos de alterações do banco de dados
  // O serviço NUNCA lê dados do Redis - todas as consultas são feitas diretamente no PostgreSQL
  // O Redis serve apenas como canal de comunicação para outras aplicações sobre mudanças nas tabelas
  
  // Lista de tabelas monitoradas para captura de eventos de alteração
  // Adicione aqui as tabelas que devem ter seus eventos de INSERT/UPDATE/DELETE publicados no Redis
  trackedTables: [
    'Championships',
    'Seasons', 
    'Categories',
    'Stages',
    'Users',
    'MemberProfiles',
    'SeasonRegistrations',
    'StageParticipations',
    'AsaasPayments',
    'ChampionshipStaff',
    'GridTypes',
    'ScoringSystems',
    'Regulations',
    'VipPreregisters'
  ],
  
  // Nome do canal Redis onde os eventos de alteração são publicados
  channelName: 'database_events',
  
  // Configurações para armazenamento temporário de eventos
  eventStorage: {
    // TTL padrão para eventos armazenados (24 horas em segundos)
    defaultTTL: 86400,
    // Prefixo para chaves de eventos armazenados
    keyPrefix: 'event:'
  }
}; 