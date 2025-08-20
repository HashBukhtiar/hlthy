#!/bin/bash

# HLTHY Coach Docker Deployment Script

set -e

echo "🏋️ HLTHY Coach - Docker Deployment"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check for Google Cloud credentials
if [ ! -f ~/.config/gcloud/application_default_credentials.json ]; then
    print_warning "Google Cloud credentials not found at default location."
    print_warning "Make sure to authenticate with: gcloud auth application-default login"
fi

# Parse command line arguments
ACTION=${1:-"build"}

case $ACTION in
    "build")
        print_status "Building HLTHY Coach Docker image..."
        docker build -t hlthy-coach:latest .
        print_status "Build complete! ✅"
        ;;
    
    "run")
        print_status "Starting HLTHY Coach container..."
        docker-compose up -d
        print_status "Container started! ✅"
        print_status "API available at: http://localhost:5001"
        print_status "Health check: http://localhost:5001/api/health"
        ;;
    
    "stop")
        print_status "Stopping HLTHY Coach container..."
        docker-compose down
        print_status "Container stopped! ✅"
        ;;
    
    "restart")
        print_status "Restarting HLTHY Coach..."
        docker-compose down
        docker build -t hlthy-coach:latest .
        docker-compose up -d
        print_status "Restart complete! ✅"
        ;;
    
    "logs")
        print_status "Showing container logs..."
        docker-compose logs -f hlthy-coach
        ;;
    
    "shell")
        print_status "Opening shell in container..."
        docker-compose exec hlthy-coach /bin/bash
        ;;
    
    "test")
        print_status "Running API tests..."
        sleep 5  # Wait for container to start
        curl -f http://localhost:5001/api/health || {
            print_error "Health check failed!"
            exit 1
        }
        print_status "API is healthy! ✅"
        ;;
    
    "deploy")
        print_status "Full deployment pipeline..."
        print_status "1. Building image..."
        docker build -t hlthy-coach:latest .
        
        print_status "2. Starting services..."
        docker-compose up -d
        
        print_status "3. Waiting for startup..."
        sleep 10
        
        print_status "4. Health check..."
        for i in {1..5}; do
            if curl -f http://localhost:5001/api/health > /dev/null 2>&1; then
                print_status "Deployment successful! ✅"
                print_status "API available at: http://localhost:5001"
                exit 0
            fi
            print_warning "Waiting for service to start... (attempt $i/5)"
            sleep 5
        done
        
        print_error "Deployment failed - health check timeout"
        docker-compose logs hlthy-coach
        exit 1
        ;;
    
    "clean")
        print_status "Cleaning up Docker resources..."
        docker-compose down
        docker rmi hlthy-coach:latest 2>/dev/null || true
        docker system prune -f
        print_status "Cleanup complete! ✅"
        ;;
    
    *)
        echo "Usage: $0 {build|run|stop|restart|logs|shell|test|deploy|clean}"
        echo ""
        echo "Commands:"
        echo "  build   - Build the Docker image"
        echo "  run     - Start the container with docker-compose"
        echo "  stop    - Stop the container"
        echo "  restart - Rebuild and restart the container"
        echo "  logs    - Show container logs"
        echo "  shell   - Open shell in running container"
        echo "  test    - Test API health"
        echo "  deploy  - Full deployment with health checks"
        echo "  clean   - Remove containers and clean up"
        exit 1
        ;;
esac
