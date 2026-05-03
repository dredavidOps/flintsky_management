#!/bin/bash
# Kubernetes Deployment Script for Flintsky Management
# Usage: ./scripts/k8s-deploy.sh [development|production] [build|deploy|all]

set -e

ENVIRONMENT=${1:-development}
ACTION=${2:-all}
CLUSTER_NAME="flintsky"
NAMESPACE="flintsky"

echo "🚀 Flintsky Management Kubernetes Deploy"
echo "========================================="
echo "Environment: $ENVIRONMENT"
echo "Action: $ACTION"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command_exists kubectl; then
        log_error "kubectl is not installed. Please install it first."
        exit 1
    fi
    
    if ! command_exists docker; then
        log_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    if [ "$ENVIRONMENT" == "development" ]; then
        if ! command_exists kind; then
            log_error "kind is not installed. Please install it first."
            exit 1
        fi
    fi
    
    log_info "All prerequisites met!"
}

# Create Kind cluster
setup_kind() {
    log_info "Setting up Kind cluster..."
    
    if kind get clusters | grep -q "^${CLUSTER_NAME}$"; then
        log_warn "Cluster '${CLUSTER_NAME}' already exists. Skipping creation."
    else
        log_info "Creating Kind cluster..."
        cat <<EOF | kind create cluster --name ${CLUSTER_NAME} --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    extraPortMappings:
      - containerPort: 80
        hostPort: 8080
        protocol: TCP
      - containerPort: 30000
        hostPort: 8000
        protocol: TCP
      - containerPort: 30001
        hostPort: 5173
        protocol: TCP
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
EOF
    fi
    
    # Install NGINX Ingress Controller
    log_info "Installing NGINX Ingress Controller..."
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
    
    log_info "Waiting for ingress controller to be ready..."
    kubectl wait --namespace ingress-nginx \
      --for=condition=ready pod \
      --selector=app.kubernetes.io/component=controller \
      --timeout=90s 2>/dev/null || true
    
    log_info "Kind cluster setup complete!"
}

# Build images
build_images() {
    log_info "Building Docker images..."
    
    # Build backend
    log_info "Building backend image..."
    docker build -t flintsky/backend:latest .
    
    # Build frontend
    log_info "Building frontend image..."
    if [ -f "frontend/Dockerfile.prod" ]; then
        docker build -f frontend/Dockerfile.prod -t flintsky/frontend:latest .
    else
        log_warn "Production Dockerfile not found, using dev Dockerfile..."
        docker build -f frontend/Dockerfile -t flintsky/frontend:latest ./frontend
    fi
    
    # Load images into Kind if using development environment
    if [ "$ENVIRONMENT" == "development" ]; then
        log_info "Loading images into Kind cluster..."
        kind load docker-image flintsky/backend:latest --name ${CLUSTER_NAME}
        kind load docker-image flintsky/frontend:latest --name ${CLUSTER_NAME}
    fi
    
    log_info "Images built successfully!"
}

# Deploy to Kubernetes
deploy() {
    log_info "Deploying to Kubernetes ($ENVIRONMENT)..."
    
    # Apply manifests
    kubectl apply -k k8s/overlays/${ENVIRONMENT}/
    
    # Wait for deployments
    log_info "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available --timeout=120s deployment/django -n ${NAMESPACE} || true
    kubectl wait --for=condition=available --timeout=120s deployment/frontend -n ${NAMESPACE} || true
    
    log_info "Deployment complete!"
}

# Run migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Wait for postgres to be ready
    log_info "Waiting for PostgreSQL to be ready..."
    kubectl wait --for=condition=ready pod -l app=postgres -n ${NAMESPACE} --timeout=120s || true
    sleep 5
    
    # Run migrations
    kubectl exec -it deployment/django -n ${NAMESPACE} -- python manage.py migrate
    
    log_info "Migrations complete!"
}

# Create admin user
create_admin() {
    log_info "Creating admin user..."
    
    kubectl exec -it deployment/django -n ${NAMESPACE} -- python manage.py shell << 'EOF'
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print("Admin user created: admin/admin123")
else:
    print("Admin user already exists")
EOF
}

# Show status
show_status() {
    log_info "Deployment Status:"
    echo "=================="
    
    echo ""
    echo "Pods:"
    kubectl get pods -n ${NAMESPACE}
    
    echo ""
    echo "Services:"
    kubectl get services -n ${NAMESPACE}
    
    echo ""
    echo "Ingress:"
    kubectl get ingress -n ${NAMESPACE} 2>/dev/null || echo "No ingress configured"
    
    echo ""
    echo "Access URLs:"
    if [ "$ENVIRONMENT" == "development" ]; then
        echo "  API:      http://localhost:8000/api/"
        echo "  Admin:    http://localhost:8000/admin/"
        echo "  Frontend: http://localhost:5173"
        echo "  Ingress:  http://localhost:8080"
    else
        echo "  Check ingress for external URLs"
    fi
}

# Main execution
main() {
    check_prerequisites
    
    case $ACTION in
        build)
            if [ "$ENVIRONMENT" == "development" ]; then
                setup_kind
            fi
            build_images
            ;;
        deploy)
            deploy
            run_migrations
            show_status
            ;;
        all)
            if [ "$ENVIRONMENT" == "development" ]; then
                setup_kind
            fi
            build_images
            deploy
            run_migrations
            create_admin
            show_status
            ;;
        *)
            echo "Usage: $0 [development|production] [build|deploy|all]"
            exit 1
            ;;
    esac
    
    log_info "Done!"
}

main
