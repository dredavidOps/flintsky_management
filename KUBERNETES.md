# 🚀 Kubernetes Orchestration & Cloud Migration Guide

Complete guide for deploying Flintsky Management on Kubernetes with a clear path to cloud migration.

---

## 📋 Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Local Development with Kind](#local-development-with-kind)
3. [Production-Ready Kubernetes Setup](#production-ready-kubernetes-setup)
4. [Cloud Migration Path](#cloud-migration-path)
5. [Monitoring & Observability](#monitoring--observability)
6. [Security Best Practices](#security-best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Current State Analysis

### What Exists Now

| Component | Current State | Notes |
|-----------|--------------|-------|
| `docker-compose.yml` | ✅ Working | Local development setup |
| `k8s/` manifests | ⚠️ Basic | Single-file deployment, not production-ready |
| `bridge/` manifests | ⚠️ Kompose-generated | Desktop-only, hardcoded paths |
| Frontend | ✅ React + Vite | Needs production build |
| Backend | ✅ Django + DRF | Gunicorn ready |
| Database | ✅ PostgreSQL | Needs persistent storage strategy |
| Monitoring | ✅ Prometheus/Grafana | Needs K8s integration |

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Ingress (NGINX)                       │
│                    ┌─────────┬─────────┐                     │
│                    │   /     │  /api/* │                     │
│                    └────┬────┴────┬────┘                     │
└─────────────────────────┼─────────┼───────────────────────────┘
                          │         │
                   ┌──────┘         └──────┐
                   ▼                       ▼
            ┌──────────────┐      ┌──────────────┐
            │   Frontend   │      │    Django    │
            │  (React/Vite)│      │     API      │
            │   :80/:5173  │      │    :8000     │
            └──────────────┘      └──────┬───────┘
                                         │
                                         ▼
                              ┌────────────────────┐
                              │    PostgreSQL      │
                              │      :5432         │
                              │  (Persistent PVC)  │
                              └────────────────────┘
```

---

## Local Development with Kind

### Prerequisites

```bash
# Install required tools
brew install kind kubectl helm

# Or on Linux
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.23.0/kind-linux-amd64
chmod +x kind
sudo mv kind /usr/local/bin/
```

### Step 1: Create Kind Cluster

```bash
# Create cluster with ingress support
cat <<EOF | kind create cluster --name flintsky --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    extraPortMappings:
      # Ingress HTTP
      - containerPort: 80
        hostPort: 8080
        protocol: TCP
      # Django API
      - containerPort: 30000
        hostPort: 8000
        protocol: TCP
      # Frontend
      - containerPort: 30001
        hostPort: 5173
        protocol: TCP
      # Grafana
      - containerPort: 30002
        hostPort: 3000
        protocol: TCP
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
EOF
```

### Step 2: Install NGINX Ingress Controller

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Wait for ingress controller
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s
```

### Step 3: Build and Load Images

```bash
# Build backend image
docker build -t flintsky/backend:latest .

# Build frontend image (production)
cd frontend
docker build -f Dockerfile.prod -t flintsky/frontend:latest ..
cd ..

# Load images into Kind
kind load docker-image flintsky/backend:latest --name flintsky
kind load docker-image flintsky/frontend:latest --name flintsky
```

### Step 4: Deploy with Kustomize

```bash
# Apply base manifests
kubectl apply -k k8s/overlays/development/

# Or apply manually for quick testing
kubectl apply -f k8s/base/
```

### Step 5: Run Migrations and Create Admin

```bash
# Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app=django --timeout=120s

# Run migrations
kubectl exec -it deployment/django -- python manage.py migrate

# Create superuser
kubectl exec -it deployment/django -- python manage.py createsuperuser

# Or auto-create with script
kubectl exec -it deployment/django -- python manage.py shell << 'EOF'
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print("Admin user created: admin/admin123")
EOF
```

### Step 6: Access Services

| Service | URL | Notes |
|---------|-----|-------|
| API | http://localhost:8000/api/ | Via NodePort |
| Frontend | http://localhost:5173 | Via NodePort |
| Admin | http://localhost:8000/admin/ | Django admin |
| Grafana | http://localhost:3000 | admin/admin |

---

## Production-Ready Kubernetes Setup

### Recommended Directory Structure

```
k8s/
├── base/                          # Base manifests (environment-agnostic)
│   ├── namespace.yaml
│   ├── configmap.yaml             # Non-sensitive config
│   ├── secret.yaml                # ENCOURAGED: Use SealedSecrets or External Secrets
│   ├── postgres/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── pvc.yaml
│   │   └── backup-cronjob.yaml    # Database backup job
│   ├── django/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── hpa.yaml               # Horizontal Pod Autoscaler
│   │   └── pdb.yaml               # Pod Disruption Budget
│   ├── frontend/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── ingress/
│   │   └── ingress.yaml
│   └── monitoring/
│       ├── servicemonitor.yaml
│       └── prometheus-rules.yaml
├── overlays/
│   ├── development/               # Kind/local dev
│   │   ├── kustomization.yaml
│   │   ├── patches/
│   │   └── secrets/
│   ├── staging/                   # Staging environment
│   │   ├── kustomization.yaml
│   │   ├── patches/
│   │   └── secrets/
│   └── production/                # Production environment
│       ├── kustomization.yaml
│       ├── patches/
│       └── secrets/
└── helm/                          # Alternative Helm chart
    └── flintsky/
```

### 1. Namespace & Basic Resources

```yaml
# k8s/base/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: flintsky
  labels:
    app: flintsky
    environment: production
```

### 2. ConfigMap (Non-sensitive Config)

```yaml
# k8s/base/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: flintsky-config
  namespace: flintsky
data:
  DATABASE_NAME: "propertymgmt"
  DATABASE_USER: "postgres"
  DATABASE_HOST: "postgres"
  DATABASE_PORT: "5432"
  DJANGO_ALLOWED_HOSTS: "api.flintsky.com,localhost"
  DEBUG: "0"
  CORS_ALLOWED_ORIGINS: "https://app.flintsky.com,https://admin.flintsky.com"
```

### 3. Secrets (Use External Secrets Operator for Production)

```yaml
# k8s/overlays/development/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: flintsky-secrets
  namespace: flintsky
type: Opaque
stringData:
  SECRET_KEY: "your-very-secret-key-change-in-production"
  DATABASE_PASSWORD: "postgres"
  DJANGO_ADMIN_PASSWORD: "admin123"
---
# For production, use External Secrets Operator:
# apiVersion: external-secrets.io/v1beta1
# kind: ExternalSecret
# metadata:
#   name: flintsky-secrets
#   namespace: flintsky
# spec:
#   secretStoreRef:
#     name: aws-secrets-manager
#     kind: SecretStore
#   target:
#     name: flintsky-secrets
#   dataFrom:
#     - extract:
#         key: prod/flintsky/secrets
```

### 4. PostgreSQL StatefulSet (Production-Grade)

```yaml
# k8s/base/postgres/statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: flintsky
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
          name: postgres
        env:
        - name: POSTGRES_DB
          valueFrom:
            configMapKeyRef:
              name: flintsky-config
              key: DATABASE_NAME
        - name: POSTGRES_USER
          valueFrom:
            configMapKeyRef:
              name: flintsky-config
              key: DATABASE_USER
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: flintsky-secrets
              key: DATABASE_PASSWORD
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - postgres
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - postgres
          initialDelaySeconds: 5
          periodSeconds: 5
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

### 5. Django Deployment with HPA

```yaml
# k8s/base/django/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: django
  namespace: flintsky
  labels:
    app: django
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: django
  template:
    metadata:
      labels:
        app: django
    spec:
      initContainers:
      # Run migrations before starting app
      - name: migrate
        image: flintsky/backend:latest
        command: ['python', 'manage.py', 'migrate']
        envFrom:
        - configMapRef:
            name: flintsky-config
        - secretRef:
            name: flintsky-secrets
      # Collect static files
      - name: collectstatic
        image: flintsky/backend:latest
        command: ['python', 'manage.py', 'collectstatic', '--noinput']
        envFrom:
        - configMapRef:
            name: flintsky-config
        - secretRef:
            name: flintsky-secrets
      containers:
      - name: django
        image: flintsky/backend:latest
        ports:
        - containerPort: 8000
        envFrom:
        - configMapRef:
            name: flintsky-config
        - secretRef:
            name: flintsky-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
---
# k8s/base/django/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: django-hpa
  namespace: flintsky
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: django
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 6. Frontend Deployment

```yaml
# k8s/base/frontend/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: flintsky
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: flintsky/frontend:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
          limits:
            memory: "128Mi"
            cpu: "200m"
```

### 7. Ingress with TLS

```yaml
# k8s/base/ingress/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flintsky-ingress
  namespace: flintsky
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.flintsky.com
    - app.flintsky.com
    secretName: flintsky-tls
  rules:
  - host: api.flintsky.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: django
            port:
              number: 8000
  - host: app.flintsky.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
```

### 8. Kustomization

```yaml
# k8s/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: flintsky

resources:
  - ../../base/namespace.yaml
  - ../../base/configmap.yaml
  - ../../base/postgres/
  - ../../base/django/
  - ../../base/frontend/
  - ../../base/ingress/

patchesStrategicMerge:
  - patches/resource-limits.yaml
  - patches/replica-count.yaml

images:
  - name: flintsky/backend
    newTag: v1.2.3
  - name: flintsky/frontend
    newTag: v1.2.3

configMapGenerator:
  - name: flintsky-config
    behavior: merge
    literals:
      - DEBUG=0
      - DJANGO_ALLOWED_HOSTS=api.flintsky.com
```

---

## Cloud Migration Path

### Phase 1: Container Registry

```bash
# AWS ECR
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker tag flintsky/backend:latest <account>.dkr.ecr.<region>.amazonaws.com/flintsky/backend:v1.0.0
docker push <account>.dkr.ecr.<region>.amazonaws.com/flintsky/backend:v1.0.0

# GCP Artifact Registry
gcloud auth configure-docker <region>-docker.pkg.dev
docker tag flintsky/backend:latest <region>-docker.pkg.dev/<project>/flintsky/backend:v1.0.0
docker push <region>-docker.pkg.dev/<project>/flintsky/backend:v1.0.0

# Azure ACR
az acr login --name <registry>
docker tag flintsky/backend:latest <registry>.azurecr.io/flintsky/backend:v1.0.0
docker push <registry>.azurecr.io/flintsky/backend:v1.0.0
```

### Phase 2: Managed Database (Recommended)

Replace the in-cluster PostgreSQL with a managed database:

| Cloud | Service | Connection String |
|-------|---------|-------------------|
| AWS | RDS PostgreSQL | `postgres.<region>.rds.amazonaws.com` |
| GCP | Cloud SQL | Use Cloud SQL Auth Proxy |
| Azure | Azure Database | `<server>.postgres.database.azure.com` |

```yaml
# Update ConfigMap for managed DB
apiVersion: v1
kind: ConfigMap
metadata:
  name: flintsky-config
data:
  DATABASE_HOST: "prod-flintsky.cluster-xxx.us-east-1.rds.amazonaws.com"
  DATABASE_NAME: "propertymgmt"
  DATABASE_PORT: "5432"
  # Use IAM auth or secrets for credentials
```

### Phase 3: Managed Kubernetes

| Cloud | Service | Command |
|-------|---------|---------|
| AWS | EKS | `eksctl create cluster --name flintsky --region us-east-1` |
| GCP | GKE | `gcloud container clusters create flintsky --zone us-central1-a` |
| Azure | AKS | `az aks create --resource-group flintsky --name flintsky` |

### Phase 4: Cloud-Native Add-ons

```bash
# Install cert-manager for TLS
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets

# Install AWS Load Balancer Controller (for EKS)
helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller
```

### Phase 5: GitOps with ArgoCD/Flux

```yaml
# argo-application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: flintsky
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/yourorg/flintsky_management
    targetRevision: main
    path: k8s/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: flintsky
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

---

## Monitoring & Observability

### Prometheus ServiceMonitor

```yaml
# k8s/base/monitoring/servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: flintsky-metrics
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: django
  endpoints:
  - port: metrics
    path: /metrics
    interval: 30s
```

### Loki for Log Aggregation

```yaml
# Add to k8s/base/django/deployment.yaml
- name: LOG_FORMAT
  value: "json"
```

---

## Security Best Practices

### 1. Use Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: postgres-netpol
  namespace: flintsky
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: django
    ports:
    - protocol: TCP
      port: 5432
```

### 2. Run as Non-Root

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 1000
```

### 3. Use Pod Security Standards

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: flintsky
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### 4. Resource Quotas & Limits

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: flintsky-quota
  namespace: flintsky
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    pods: "20"
```

---

## Troubleshooting

### Common Issues

| Issue | Command | Solution |
|-------|---------|----------|
| Pod not starting | `kubectl describe pod <name>` | Check events, image pull errors |
| CrashLoopBackOff | `kubectl logs <pod> --previous` | Check application logs |
| OOMKilled | `kubectl top pod` | Increase memory limits |
| Pending PVC | `kubectl get pvc` | Check storage class availability |
| Service unreachable | `kubectl get endpoints` | Verify selector labels match |

### Useful Commands

```bash
# Debug pod
kubectl run debug --rm -it --image=busybox --restart=Never -- /bin/sh

# Port forward for local testing
kubectl port-forward svc/django 8000:8000

# Check resource usage
kubectl top nodes
kubectl top pods

# Rollout status
kubectl rollout status deployment/django
kubectl rollout undo deployment/django  # Rollback

# Execute commands in pod
kubectl exec -it deployment/django -- python manage.py shell
```

---

## Quick Reference

### Deploy to Local Kind

```bash
# One-liner deployment
cd flintsky_management && \
  kind create cluster --name flintsky && \
  docker build -t flintsky/backend:latest . && \
  kind load docker-image flintsky/backend:latest --name flintsky && \
  kubectl apply -k k8s/overlays/development/ && \
  kubectl wait --for=condition=ready pod -l app=django && \
  kubectl exec deployment/django -- python manage.py migrate
```

### Deploy to Production

```bash
# 1. Update image tags in kustomization.yaml
# 2. Commit and push
# 3. ArgoCD auto-syncs, or manual:
kubectl apply -k k8s/overlays/production/
```

---

## Next Steps

1. ✅ Set up local Kind cluster
2. ✅ Implement proper Kustomize structure
3. ⬜ Add Helm chart alternative
4. ⬜ Set up CI/CD pipeline (GitHub Actions/GitLab CI)
5. ⬜ Configure external secrets management
6. ⬜ Implement database backup strategy
7. ⬜ Set up monitoring stack (Prometheus/Grafana in K8s)
8. ⬜ Create Terraform modules for cloud infrastructure

---

*This guide provides a production-ready foundation for Kubernetes deployment and cloud migration. Adapt resource limits, storage classes, and networking based on your specific cloud provider and requirements.*
