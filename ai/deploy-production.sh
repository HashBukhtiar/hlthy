#!/bin/bash

# HLTHY Coach - Google Cloud Production Deployment Script

set -e

echo "🏋️ HLTHY Coach - Production Deployment to Google Cloud"
echo "===================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_header() { echo -e "${BLUE}[STEP]${NC} $1"; }

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    print_error "Google Cloud CLI (gcloud) is not installed."
    print_error "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    print_error "Not authenticated with Google Cloud."
    print_error "Please run: gcloud auth login"
    exit 1
fi

# Get current project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    print_error "No Google Cloud project set."
    print_error "Please run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

print_status "Using Google Cloud project: $PROJECT_ID"

# Parse command line arguments
ACTION=${1:-"deploy"}

case $ACTION in
    "build")
        print_header "Building and pushing Docker image to Google Cloud..."
        gcloud builds submit --config cloudbuild.yaml ..
        print_status "Build complete! ✅"
        ;;
    
    "deploy")
        print_header "Deploying HLTHY Coach to Google Cloud Run..."
        
        print_status "1. Building and pushing image..."
        gcloud builds submit --config cloudbuild.yaml ..
        
        print_status "2. Deployment complete! ✅"
        
        # Get the service URL
        SERVICE_URL=$(gcloud run services describe hlthy-ai-service \
            --region=northamerica-northeast2 \
            --format='value(status.url)')
        
        print_status "🚀 Service deployed successfully!"
        print_status "📡 Service URL: $SERVICE_URL"
        print_status "🏥 Health check: $SERVICE_URL/api/health"
        print_status "🧠 Intent classification: $SERVICE_URL/api/classify-intent"
        
        print_header "Testing deployment..."
        sleep 10
        
        if curl -f "$SERVICE_URL/api/health" > /dev/null 2>&1; then
            print_status "✅ Health check passed!"
            
            # Test intent classification
            INTENT_TEST=$(curl -s -X POST "$SERVICE_URL/api/classify-intent" \
                -H "Content-Type: application/json" \
                -d '{"message": "I need a chest workout"}' | jq -r '.intent' 2>/dev/null || echo "error")
            
            if [ "$INTENT_TEST" = "planner" ]; then
                print_status "✅ Intent classification working!"
                print_status "🎉 Deployment fully successful!"
            else
                print_warning "⚠️ Intent classification may not be working properly"
            fi
        else
            print_error "❌ Health check failed"
            exit 1
        fi
        ;;
    
    "status")
        print_header "Checking service status..."
        gcloud run services describe hlthy-ai-service \
            --region=northamerica-northeast2 \
            --format='table(metadata.name,status.url,status.conditions[0].type,status.conditions[0].status)'
        ;;
    
    "logs")
        print_header "Showing service logs..."
        gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=hlthy-ai-service" \
            --limit=50 --format='table(timestamp,textPayload)'
        ;;
    
    "rollback")
        print_header "Rolling back to previous version..."
        gcloud run services update-traffic hlthy-ai-service \
            --to-revisions=LATEST=0,hlthy-ai-service-previous=100 \
            --region=northamerica-northeast2
        print_status "Rollback complete! ✅"
        ;;
    
    "delete")
        print_warning "This will DELETE the hlthy-ai-service from Google Cloud Run!"
        read -p "Are you sure? (yes/no): " -r
        if [[ $REPLY =~ ^yes$ ]]; then
            gcloud run services delete hlthy-ai-service --region=northamerica-northeast2 --quiet
            print_status "Service deleted! ✅"
        else
            print_status "Deletion cancelled."
        fi
        ;;
    
    *)
        echo "Usage: $0 {build|deploy|status|logs|rollback|delete}"
        echo ""
        echo "Commands:"
        echo "  build     - Build and push Docker image to Google Cloud"
        echo "  deploy    - Full deployment to Google Cloud Run (default)"
        echo "  status    - Check service status"
        echo "  logs      - Show recent service logs"
        echo "  rollback  - Rollback to previous version"
        echo "  delete    - Delete the service"
        echo ""
        echo "Prerequisites:"
        echo "  - Google Cloud CLI installed and authenticated"
        echo "  - Project ID configured: gcloud config set project YOUR_PROJECT_ID"
        exit 1
        ;;
esac
