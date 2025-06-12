# BRK Backend - Configuração Docker

Este documento explica como usar a configuração Docker do projeto BRK Backend.

## 📋 Arquivos Docker

### Principais
- `Dockerfile` - Produção (multi-stage build otimizado)
- `Dockerfile.dev` - Desenvolvimento (com hot reload)
- `docker-compose.yml` - Produção
- `docker-compose.dev.yml` - Desenvolvimento
- `.dockerignore` - Arquivos ignorados no build

### Scripts de Automação
- `scripts/docker-dev.sh` - Gerenciamento do ambiente de desenvolvimento
- `scripts/docker-prod.sh` - Gerenciamento do ambiente de produção

## 🚀 Início Rápido

### Desenvolvimento

```bash
# Iniciar ambiente de desenvolvimento
./scripts/docker-dev.sh start

# Ver logs
./scripts/docker-dev.sh logs

# Parar ambiente
./scripts/docker-dev.sh stop
```

### Produção

```bash
# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com valores de produção

# Iniciar ambiente de produção
./scripts/docker-prod.sh start

# Com Nginx (recomendado para produção)
./scripts/docker-prod.sh start-nginx
```

## 🛠️ Ambiente de Desenvolvimento

### Serviços Inclusos

- **brk-backend** - Aplicação principal com hot reload
- **postgres** - PostgreSQL 16
- **redis** - Redis 7
- **adminer** - Interface web para PostgreSQL (http://localhost:8080)
- **redis-commander** - Interface web para Redis (http://localhost:8081)

### Comandos Disponíveis

```bash
./scripts/docker-dev.sh start         # Iniciar todos os serviços
./scripts/docker-dev.sh stop          # Parar todos os serviços
./scripts/docker-dev.sh restart       # Reiniciar serviço específico
./scripts/docker-dev.sh logs          # Ver logs de serviço específico
./scripts/docker-dev.sh status        # Status dos serviços
./scripts/docker-dev.sh migrate       # Executar migrations
./scripts/docker-dev.sh reset-db      # Resetar banco de desenvolvimento
./scripts/docker-dev.sh cleanup       # Limpar containers e volumes
```

### Configuração de Debug

O ambiente de desenvolvimento expõe a porta 9229 para debugging:

```json
// .vscode/launch.json
{
  "type": "node",
  "request": "attach",
  "name": "Docker Debug",
  "remoteRoot": "/app",
  "localRoot": "${workspaceFolder}",
  "port": 9229,
  "restart": true
}
```

## 🏭 Ambiente de Produção

### Serviços Inclusos

- **brk-backend** - Aplicação principal otimizada
- **postgres** - PostgreSQL 16 com persistência
- **redis** - Redis 7 com persistência
- **nginx** - Reverse proxy (opcional, usar profile nginx)

### Comandos Disponíveis

```bash
./scripts/docker-prod.sh start           # Iniciar ambiente básico
./scripts/docker-prod.sh start-nginx     # Iniciar com Nginx
./scripts/docker-prod.sh stop            # Parar todos os serviços
./scripts/docker-prod.sh restart         # Reiniciar serviço específico
./scripts/docker-prod.sh logs            # Ver logs
./scripts/docker-prod.sh status          # Status e uso de recursos
./scripts/docker-prod.sh migrate         # Executar migrations
./scripts/docker-prod.sh backup-db       # Backup do banco
./scripts/docker-prod.sh restore-db      # Restaurar banco
./scripts/docker-prod.sh update          # Atualizar aplicação
./scripts/docker-prod.sh monitor         # Monitorar logs
./scripts/docker-prod.sh cleanup         # Limpeza do sistema
```

## ⚙️ Configuração

### Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

```bash
# Aplicação
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Banco de Dados
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=sua_senha_segura
DB_DATABASE=brk_competition

# Redis
REDIS_PASSWORD=sua_senha_redis

# JWT
JWT_SECRET=sua_chave_jwt_super_secreta

# Email
BREVO_API_KEY=sua_chave_brevo
BREVO_SENDER_EMAIL=noreply@seudominio.com

# Frontend
FRONTEND_URL=https://seudominio.com
```

### Volumes Persistentes

#### Desenvolvimento
- `postgres_dev_data` - Dados do PostgreSQL
- `redis_dev_data` - Dados do Redis

#### Produção
- `data/postgres` - Dados do PostgreSQL (bind mount)
- `data/redis` - Dados do Redis (bind mount)
- `backups/` - Backups do banco de dados

## 🔒 Segurança

### Medidas Implementadas

- **Usuário não-root** - Containers executam como usuário `nodejs`
- **Recursos limitados** - CPU e memória limitados
- **No new privileges** - Previne escalação de privilégios
- **Read-only filesystems** - Onde aplicável
- **Secrets management** - Variáveis de ambiente para credenciais
- **Health checks** - Monitoramento da saúde dos serviços

### Recomendações para Produção

1. **Configure SSL/TLS**
   ```bash
   # Coloque certificados em nginx/ssl/
   nginx/ssl/certificate.crt
   nginx/ssl/private.key
   ```

2. **Use senhas fortes**
   ```bash
   openssl rand -base64 32  # Para JWT_SECRET
   openssl rand -base64 16  # Para senhas
   ```

3. **Configure firewall**
   ```bash
   # Exemplo com ufw
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw deny 3000/tcp  # Não expor diretamente
   ```

4. **Monitore logs**
   ```bash
   ./scripts/docker-prod.sh logs | grep ERROR
   ```

## 📊 Monitoramento

### Health Checks

Todos os serviços têm health checks configurados:

- **Backend**: `GET /health`
- **PostgreSQL**: `pg_isready`
- **Redis**: `redis-cli ping`
- **Nginx**: `GET /health` (proxy para backend)

### Logs

Os logs são limitados para evitar uso excessivo de disco:

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### Backup Automático

Para backup automático, configure um cron job:

```bash
# Adicionar ao crontab
0 2 * * * cd /path/to/project && ./scripts/docker-prod.sh backup-db
```

## 🔧 Troubleshooting

### Problemas Comuns

1. **Porta em uso**
   ```bash
   # Verificar portas em uso
   lsof -i :3000
   
   # Alterar porta no .env
   PORT=3001
   ```

2. **Permissões de volume**
   ```bash
   # Corrigir permissões
   sudo chown -R 1001:1001 data/
   ```

3. **Memória insuficiente**
   ```bash
   # Verificar uso de recursos
   docker stats
   
   # Ajustar limites no docker-compose.yml
   ```

4. **Build falhando**
   ```bash
   # Build sem cache
   docker-compose build --no-cache
   
   # Verificar .dockerignore
   ```

### Comandos Úteis

```bash
# Verificar logs de um container específico
docker logs brk-backend

# Executar comando dentro do container
docker exec -it brk-backend sh

# Verificar uso de recursos
docker stats

# Limpar sistema Docker
docker system prune -a

# Verificar saúde dos serviços
docker-compose ps
```

## 📁 Estrutura de Diretórios

```
├── docker-compose.yml              # Produção
├── docker-compose.dev.yml          # Desenvolvimento
├── Dockerfile                      # Build de produção
├── Dockerfile.dev                  # Build de desenvolvimento
├── .dockerignore                   # Arquivos ignorados
├── .env.example                    # Template de variáveis
├── scripts/
│   ├── docker-dev.sh              # Script de desenvolvimento
│   └── docker-prod.sh             # Script de produção
├── data/                           # Dados persistentes (produção)
│   ├── postgres/
│   └── redis/
├── nginx/                          # Configuração Nginx
│   ├── nginx.conf
│   ├── conf.d/
│   └── ssl/
├── backups/                        # Backups do banco
└── logs/                           # Logs da aplicação
```

## 🚀 Deploy em Produção

### Servidor VPS/Cloud

1. **Preparar servidor**
   ```bash
   # Instalar Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   
   # Instalar Docker Compose
   pip install docker-compose
   ```

2. **Clonar projeto**
   ```bash
   git clone <repository>
   cd brk-backend
   ```

3. **Configurar ambiente**
   ```bash
   cp .env.example .env
   # Editar .env com valores de produção
   ```

4. **Iniciar aplicação**
   ```bash
   ./scripts/docker-prod.sh start-nginx
   ```

### CI/CD

Exemplo para GitHub Actions:

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to server
        run: |
          ssh user@server "cd /app && git pull && ./scripts/docker-prod.sh update"
```

## 📚 Referências

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Node.js Docker Guide](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Redis Docker Hub](https://hub.docker.com/_/redis) 