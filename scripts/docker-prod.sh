#!/bin/bash

# ===================================
# BRK Backend - Production Docker Script
# ===================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if docker and docker-compose are installed
check_dependencies() {
    print_info "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Dependencies check passed"
}

# Check environment file
check_environment() {
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Using .env.example as template."
        
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_warning "Please edit .env file with production values before deployment!"
            exit 1
        else
            print_error ".env.example file not found. Cannot proceed."
            exit 1
        fi
    fi
    
    print_success "Environment file check passed"
}

# Create necessary directories
create_directories() {
    print_info "Creating necessary directories..."
    
    mkdir -p data/postgres
    mkdir -p data/redis
    mkdir -p logs
    mkdir -p nginx/conf.d
    mkdir -p nginx/ssl
    mkdir -p backups
    
    print_success "Directories created"
}

# Pull latest images
pull_images() {
    print_info "Pulling latest images..."
    
    docker-compose pull
    
    print_success "Images pulled"
}

# Build application
build_app() {
    print_info "Building application..."
    
    docker-compose build --no-cache
    
    print_success "Application built"
}

# Start production environment
start_prod() {
    print_info "Starting production environment..."
    
    docker-compose up -d
    
    print_success "Production environment started!"
    print_info "Services:"
    print_info "  - Backend: http://localhost:3000"
    print_info "  - Nginx: http://localhost:80"
    print_info ""
    print_info "To view logs: ./scripts/docker-prod.sh logs"
    print_info "To stop: ./scripts/docker-prod.sh stop"
}

# Start with nginx
start_with_nginx() {
    print_info "Starting production environment with Nginx..."
    
    docker-compose --profile nginx up -d
    
    print_success "Production environment with Nginx started!"
}

# Stop production environment
stop_prod() {
    print_info "Stopping production environment..."
    
    docker-compose down
    
    print_success "Production environment stopped"
}

# Show logs
show_logs() {
    local service=${2:-brk-backend}
    print_info "Showing logs for service: $service"
    
    docker-compose logs -f --tail=100 $service
}

# Restart a specific service
restart_service() {
    local service=${2:-brk-backend}
    print_info "Restarting service: $service"
    
    docker-compose restart $service
    
    print_success "Service $service restarted"
}

# Run migrations
run_migrations() {
    print_info "Running database migrations..."
    
    docker-compose exec brk-backend npm run migration:run
    
    print_success "Migrations completed"
}

# Backup database
backup_database() {
    local backup_name="backup_$(date +%Y%m%d_%H%M%S).sql"
    local backup_path="./backups/$backup_name"
    
    print_info "Creating database backup: $backup_name"
    
    docker-compose exec postgres pg_dump -U postgres brk_competition > "$backup_path"
    
    print_success "Database backup created: $backup_path"
}

# Restore database
restore_database() {
    local backup_file=$2
    
    if [ -z "$backup_file" ]; then
        print_error "Please specify backup file path"
        print_info "Usage: $0 restore-db <backup_file>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    print_warning "This will restore the database from: $backup_file"
    print_warning "All current data will be lost!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Restoring database..."
        
        docker-compose exec -T postgres psql -U postgres -d brk_competition < "$backup_file"
        
        print_success "Database restored from: $backup_file"
    else
        print_info "Database restore cancelled"
    fi
}

# Show status
show_status() {
    print_info "Production environment status:"
    docker-compose ps
    echo ""
    print_info "Resource usage:"
    docker stats --no-stream
}

# Update application
update_app() {
    print_info "Updating application..."
    
    # Backup database first
    backup_database
    
    # Pull latest changes
    print_info "Pulling latest code..."
    git pull
    
    # Pull latest images
    pull_images
    
    # Build new version
    build_app
    
    # Restart services
    print_info "Restarting services..."
    docker-compose up -d
    
    # Run migrations
    run_migrations
    
    print_success "Application updated successfully!"
}

# Monitor logs
monitor() {
    print_info "Monitoring all services logs..."
    docker-compose logs -f
}

# Clean up old images and containers
cleanup() {
    print_info "Cleaning up old Docker images and containers..."
    
    docker system prune -f
    docker image prune -f
    
    print_success "Cleanup completed"
}

# Show help
show_help() {
    echo "BRK Backend - Production Docker Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start         Start the production environment"
    echo "  start-nginx   Start with Nginx reverse proxy"
    echo "  stop          Stop the production environment"
    echo "  restart       Restart a service (default: brk-backend)"
    echo "  logs          Show logs for a service (default: brk-backend)"
    echo "  status        Show status of all services"
    echo "  migrate       Run database migrations"
    echo "  backup-db     Create database backup"
    echo "  restore-db    Restore database from backup"
    echo "  update        Update application (git pull + rebuild + restart)"
    echo "  monitor       Monitor all services logs"
    echo "  cleanup       Clean up old Docker images and containers"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start                              # Start production environment"
    echo "  $0 logs brk-backend                  # Show backend logs"
    echo "  $0 backup-db                         # Create database backup"
    echo "  $0 restore-db ./backups/backup.sql   # Restore from backup"
}

# Main execution
main() {
    case ${1:-help} in
        start)
            check_dependencies
            check_environment
            create_directories
            pull_images
            start_prod
            ;;
        start-nginx)
            check_dependencies
            check_environment
            create_directories
            pull_images
            start_with_nginx
            ;;
        stop)
            stop_prod
            ;;
        restart)
            restart_service "$@"
            ;;
        logs)
            show_logs "$@"
            ;;
        status)
            show_status
            ;;
        migrate)
            run_migrations
            ;;
        backup-db)
            backup_database
            ;;
        restore-db)
            restore_database "$@"
            ;;
        update)
            update_app
            ;;
        monitor)
            monitor
            ;;
        cleanup)
            cleanup
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 