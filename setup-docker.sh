#!/bin/bash

# BRK Backend Docker Setup Script
# This script helps set up the Docker environment for the BRK Backend application

set -e

echo "🚀 BRK Backend Docker Setup"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_status "Docker and Docker Compose are installed"
}

# Check if Docker daemon is running
check_docker_daemon() {
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi
    
    print_status "Docker daemon is running"
}

# Set proper permissions
set_permissions() {
    print_info "Setting proper permissions..."
    
    chmod +x setup-docker.sh
    
    print_status "Permissions set"
}

# Build and start services
start_services() {
    print_info "Starting development services..."
    docker-compose up -d --build
    print_status "Services started"
}

# Check service health
check_health() {
    print_info "Checking service health..."
    
    # Wait a bit for services to start
    sleep 10
    
    # Check PostgreSQL
    if docker-compose exec -T postgres pg_isready -U postgres &> /dev/null; then
        print_status "PostgreSQL is healthy"
    else
        print_warning "PostgreSQL is not ready yet"
    fi
    
    # Check Redis
    if docker-compose exec -T redis redis-cli ping &> /dev/null; then
        print_status "Redis is healthy"
    else
        print_warning "Redis is not ready yet"
    fi
    
    # Check Backend
    if curl -f http://localhost:3000/health &> /dev/null; then
        print_status "Backend is healthy"
    else
        print_warning "Backend is not ready yet"
    fi
}

# Show status
show_status() {
    print_info "Service status:"
    docker-compose ps
    
    echo ""
    print_info "Useful commands:"
    echo "  View logs:           docker-compose logs -f"
    echo "  Stop services:       docker-compose down"
    echo "  Restart backend:     docker-compose restart brk-backend"
    echo "  Run migrations:      docker-compose exec brk-backend npm run migration:run"
    echo "  Access PostgreSQL:   docker-compose exec postgres psql -U postgres -d brk_competition"
    echo "  Access Redis:        docker-compose exec redis redis-cli -a redis_password"
}

# Main function
main() {
    local command=${1:-setup}
    
    case $command in
        "setup")
            echo "Setting up Docker environment..."
            check_docker
            check_docker_daemon
            set_permissions
            print_status "Setup completed!"
            print_info "Run './setup-docker.sh start' to start the services"
            ;;
        "start")
            echo "Starting services..."
            check_docker
            check_docker_daemon
            start_services
            sleep 5
            check_health
            show_status
            ;;
        "stop")
            echo "Stopping services..."
            docker-compose down
            print_status "Services stopped"
            ;;
        "restart")
            echo "Restarting services..."
            docker-compose restart
            print_status "Services restarted"
            ;;
        "logs")
            docker-compose logs -f
            ;;
        "status")
            show_status
            ;;
        "clean")
            echo "Cleaning up Docker environment..."
            print_warning "This will remove all containers, volumes, and images!"
            read -p "Are you sure? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                docker-compose down -v --rmi all
                docker system prune -f
                print_status "Cleanup completed"
            else
                print_info "Cleanup cancelled"
            fi
            ;;
        "help"|*)
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  setup          Set up Docker environment (default)"
            echo "  start          Start all services"
            echo "  stop           Stop all services"
            echo "  restart        Restart all services"
            echo "  logs           Show service logs"
            echo "  status         Show service status"
            echo "  clean          Clean up everything (⚠️ DATA LOSS)"
            echo "  help           Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 setup              # Initial setup"
            echo "  $0 start              # Start services"
            echo "  $0 logs               # View logs"
            ;;
    esac
}

# Run main function with all arguments
main "$@" 