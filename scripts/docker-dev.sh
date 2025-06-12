#!/bin/bash

# ===================================
# BRK Backend - Development Docker Script
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

# Create necessary directories
create_directories() {
    print_info "Creating necessary directories..."
    
    mkdir -p data/postgres
    mkdir -p data/redis
    mkdir -p logs
    mkdir -p init-scripts
    
    print_success "Directories created"
}

# Start development environment
start_dev() {
    print_info "Starting development environment..."
    
    docker-compose -f docker-compose.dev.yml up -d
    
    print_success "Development environment started!"
    print_info "Services:"
    print_info "  - Backend: http://localhost:3000"
    print_info "  - Adminer: http://localhost:8080"
    print_info "  - Redis Commander: http://localhost:8081"
    print_info ""
    print_info "To view logs: ./scripts/docker-dev.sh logs"
    print_info "To stop: ./scripts/docker-dev.sh stop"
}

# Stop development environment
stop_dev() {
    print_info "Stopping development environment..."
    
    docker-compose -f docker-compose.dev.yml down
    
    print_success "Development environment stopped"
}

# Show logs
show_logs() {
    local service=${2:-brk-backend}
    print_info "Showing logs for service: $service"
    
    docker-compose -f docker-compose.dev.yml logs -f $service
}

# Restart a specific service
restart_service() {
    local service=${2:-brk-backend}
    print_info "Restarting service: $service"
    
    docker-compose -f docker-compose.dev.yml restart $service
    
    print_success "Service $service restarted"
}

# Run migrations
run_migrations() {
    print_info "Running database migrations..."
    
    docker-compose -f docker-compose.dev.yml exec brk-backend npm run migration:run
    
    print_success "Migrations completed"
}

# Reset database
reset_database() {
    print_warning "This will destroy all data in the development database!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Resetting database..."
        
        docker-compose -f docker-compose.dev.yml down
        docker volume rm brk-backend_postgres_dev_data 2>/dev/null || true
        docker-compose -f docker-compose.dev.yml up -d postgres
        
        # Wait for postgres to be ready
        sleep 10
        
        docker-compose -f docker-compose.dev.yml up -d
        
        print_success "Database reset completed"
    else
        print_info "Database reset cancelled"
    fi
}

# Show status
show_status() {
    print_info "Development environment status:"
    docker-compose -f docker-compose.dev.yml ps
}

# Clean up
cleanup() {
    print_warning "This will remove all containers, volumes, and images for the development environment!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Cleaning up..."
        
        docker-compose -f docker-compose.dev.yml down -v --rmi all
        
        print_success "Cleanup completed"
    else
        print_info "Cleanup cancelled"
    fi
}

# Show help
show_help() {
    echo "BRK Backend - Development Docker Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start         Start the development environment"
    echo "  stop          Stop the development environment"
    echo "  restart       Restart a service (default: brk-backend)"
    echo "  logs          Show logs for a service (default: brk-backend)"
    echo "  status        Show status of all services"
    echo "  migrate       Run database migrations"
    echo "  reset-db      Reset the development database"
    echo "  cleanup       Remove all containers, volumes, and images"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start                    # Start development environment"
    echo "  $0 logs brk-backend        # Show backend logs"
    echo "  $0 restart postgres        # Restart postgres service"
}

# Main execution
main() {
    case ${1:-help} in
        start)
            check_dependencies
            create_directories
            start_dev
            ;;
        stop)
            stop_dev
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
        reset-db)
            reset_database
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