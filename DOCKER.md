# Docker Setup Guide

This guide explains how to run the BRK Backend application using Docker Compose with PostgreSQL and Redis for development.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 2GB of available RAM
- At least 5GB of available disk space

## Quick Start

1. **Clone and navigate to the project:**
   ```bash
   git clone <repository-url>
   cd brk-backend
   ```

2. **Start all services:**
   ```bash
   docker-compose up -d
   ```

3. **Check service status:**
   ```bash
   docker-compose ps
   ```

4. **View logs:**
   ```bash
   # All services
   docker-compose logs -f
   
   # Specific service
   docker-compose logs -f brk-backend
   ```

## Services Overview

### PostgreSQL Database (`postgres`)
- **Image:** `postgres:16-alpine`
- **Port:** `5432`
- **Database:** `brk_competition`
- **Credentials:** `postgres/postgres` (configurable)
- **Data Persistence:** Named volume `postgres_data`

### Redis Cache (`redis`)
- **Image:** `redis:7-alpine`
- **Port:** `6379`
- **Password:** `redis_password` (configurable)
- **Data Persistence:** Named volume `redis_data`
- **Features:** AOF persistence enabled

### BRK Backend (`brk-backend`)
- **Build:** From local Dockerfile
- **Port:** `3000`
- **Dependencies:** PostgreSQL, Redis
- **Health Check:** `/health` endpoint
- **Configuration:** Environment variables only



## Environment Configuration

### Required Variables (set in `.env`)
```bash
# Security
JWT_SECRET=your-super-secure-jwt-secret

# Email Service
BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER_EMAIL=noreply@yourdomain.com

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Optional Variables
```bash
# Frontend URLs
FRONTEND_URL=http://localhost:5173,http://localhost:5174

# Database (if you want to override defaults)
DB_PASSWORD=custom-postgres-password
REDIS_PASSWORD=custom-redis-password
```

## Common Commands

### Start Services
```bash
# Start all services in background
docker-compose up -d

# Start with logs visible
docker-compose up

# Start specific service
docker-compose up -d postgres redis
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ DATA LOSS)
docker-compose down -v

# Stop and remove images
docker-compose down --rmi all
```

### Database Operations
```bash
# Run migrations manually
docker-compose exec brk-backend npm run migration:run

# Access PostgreSQL shell
docker-compose exec postgres psql -U postgres -d brk_competition

# Backup database
docker-compose exec postgres pg_dump -U postgres brk_competition > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres brk_competition < backup.sql
```

### Redis Operations
```bash
# Access Redis CLI
docker-compose exec redis redis-cli -a redis_password

# Monitor Redis
docker-compose exec redis redis-cli -a redis_password monitor
```

### Application Operations
```bash
# View application logs
docker-compose logs -f brk-backend

# Restart application only
docker-compose restart brk-backend

# Rebuild and restart application
docker-compose up -d --build brk-backend

# Execute command in running container
docker-compose exec brk-backend npm run migration:show
```

## Health Checks

All services include health checks:

- **PostgreSQL:** `pg_isready` command
- **Redis:** Connection test with authentication
- **Backend:** HTTP request to `/health` endpoint

Check health status:
```bash
docker-compose ps
```

## Data Persistence

### Volumes
- `postgres_data`: PostgreSQL data directory
- `redis_data`: Redis data directory

### Backup Strategy
```bash
# Backup PostgreSQL
docker-compose exec postgres pg_dump -U postgres brk_competition > postgres_backup_$(date +%Y%m%d_%H%M%S).sql

# Backup Redis
docker-compose exec redis redis-cli -a redis_password --rdb /data/dump.rdb
docker cp $(docker-compose ps -q redis):/data/dump.rdb redis_backup_$(date +%Y%m%d_%H%M%S).rdb
```

## Troubleshooting

### Common Issues

1. **Port conflicts:**
   ```bash
   # Check what's using the ports
   lsof -i :3000
   lsof -i :5432
   lsof -i :6379
   ```

2. **Permission issues:**
   ```bash
   # Fix Docker permissions (Linux/macOS)
   sudo chown -R $USER:$USER .
   ```

3. **Memory issues:**
   ```bash
   # Check Docker resource usage
   docker stats
   
   # Increase Docker memory limit in Docker Desktop
   ```

4. **Database connection issues:**
   ```bash
   # Check PostgreSQL logs
   docker-compose logs postgres
   
   # Test connection
   docker-compose exec postgres pg_isready -U postgres
   ```

5. **Migration failures:**
   ```bash
   # Check backend logs for migration errors
   docker-compose logs brk-backend
   
   # Run migrations manually with verbose output
   docker-compose exec brk-backend npm run migration:run
   ```

### Reset Everything
```bash
# Stop all services and remove volumes (⚠️ DATA LOSS)
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Clean up Docker system
docker system prune -a

# Start fresh
docker-compose up -d
```

## Development Features

This Docker setup is optimized for development and includes:

- **Local volumes** for data persistence
- **Exposed ports** for easy debugging and access
- **Easy database access** for development tools
- **Manual migration control** when needed

## Moving to Production

When you're ready to deploy to production, consider:

- Using managed databases (AWS RDS, Google Cloud SQL, etc.)
- Adding SSL/TLS termination
- Using container orchestration (Kubernetes, Docker Swarm)
- Setting up monitoring and logging
- Implementing backup strategies
- Using Redis clusters for high availability 