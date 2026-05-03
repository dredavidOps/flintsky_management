# 🏢 Flintsky Management – Property Management Platform

A full-stack property management platform built with **Django REST Framework**, **React**, and **PostgreSQL**. Designed to help property managers oversee apartment availability, track leases, manage tenants, and handle maintenance requests.

[![Django](https://img.shields.io/badge/Django-5.2.4-green.svg)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/DRF-3.16.0-red.svg)](https://www.django-rest-framework.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-blue.svg)](https://www.docker.com/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-ready-blue.svg)](https://kubernetes.io/)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blue.svg)](.github/workflows/ci-cd.yaml)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
  - [Option 1: Docker Compose (Recommended for Dev)](#option-1-local-development-with-docker-compose-recommended)
  - [Option 2: Kubernetes with Kind](#option-2-kubernetes-with-kind)
  - [Option 3: Production Kubernetes](#-kubernetes-deployment-recommended-for-production)
- [API Reference](#-api-reference)
- [Authentication](#-authentication)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)
- [Monitoring & Observability](#-monitoring--observability)
- [CI/CD](#-cicd)
- [Troubleshooting](#-troubleshooting)

---

## 🚀 Features

| Feature | Description |
|---------|-------------|
| 🏠 **Apartment Management** | Track apartment numbers, floors, bedrooms (1/2), and availability status |
| 👥 **Tenant Management** | Store tenant contact information (name, email, phone) |
| 📝 **Lease Tracking** | Manage move-in/move-out dates with overlapping lease prevention |
| 🔧 **Maintenance Requests** | Create and track maintenance issues linked to active leases |
| 📊 **Dashboard Overview** | Get occupancy stats and upcoming move-ins/outs |
| 🔐 **Token Authentication** | Secure API and frontend access with DRF token auth |
| 📈 **Monitoring** | Prometheus + Grafana dashboards with Loki log aggregation |
| ⚡ **Modern UI** | React 19 SPA with Vite, responsive design |

---

## 📦 Tech Stack

- **Backend:** Django 5.2.4 + Django REST Framework 3.16.0
- **Frontend:** React 19 + Vite
- **Database:** PostgreSQL 15
- **WSGI Server:** Gunicorn
- **Containerization:** Docker & Docker Compose
- **Orchestration:** Kubernetes (Kustomize + Kind for local development)
- **Authentication:** Token Authentication (DRF)
- **Monitoring:** Prometheus + Grafana + Loki + Promtail
- **CI/CD:** GitHub Actions

---

## 🏁 Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/) (for K8s deployment)
- [Kind](https://kind.sigs.k8s.io/docs/user/quick-start/) (optional, for local K8s cluster)

### 🚀 Kubernetes Deployment (Recommended for Production)

For a complete guide on Kubernetes orchestration and cloud migration, see **[KUBERNETES.md](KUBERNETES.md)**.

Quick start with the deployment script:

```bash
# One-command local deployment with Kind
./scripts/k8s-deploy.sh development all

# Or manual steps
kind create cluster --name flintsky
docker build -t flintsky/backend:latest .
docker build -t flintsky/frontend:latest ./frontend
kind load docker-image flintsky/backend:latest --name flintsky
kind load docker-image flintsky/frontend:latest --name flintsky
kubectl apply -k k8s/overlays/development/
kubectl exec -it deployment/django -- python manage.py migrate
```

---

### Option 1: Local Development with Docker Compose (Recommended)

The fastest way to get started for development:

```bash
# 1. Clone the repository
git clone git@github.com:dredavidOps/flintsky_management.git
cd flintsky_management

# 2. Create a .env file for local development
cat > .env << EOF
SECRET_KEY=your-secret-key-here-change-in-production
DEBUG=1
DATABASE_NAME=propertymgmt
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_HOST=db
DATABASE_PORT=5432
EOF

# 3. Build and start services
docker-compose up --build

# Or to start only the backend API:
docker-compose up --build web db

# To start the frontend separately:
cd frontend && npm install && npm run dev

# 4. Run migrations (in another terminal)
docker-compose exec web python manage.py migrate

# 5. Create a superuser (optional, for admin access)
docker-compose exec web python manage.py createsuperuser

# 6. Generate API token for testing
docker-compose exec web python manage.py shell -c "
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
user, _ = User.objects.get_or_create(username='admin', defaults={'is_staff': True, 'is_superuser': True})
user.set_password('admin')
user.save()
token, _ = Token.objects.get_or_create(user=user)
print(f'API Token: {token.key}')
"
```

The API will be available at: **http://localhost:8000/api/**
The frontend will be available at: **http://localhost:5173/** (if running separately)

---

### Option 2: Kubernetes with Kind

For production-like deployment locally using Kustomize overlays:

```bash
# 1. Clone and navigate
git clone git@github.com:dredavidOps/flintsky_management.git
cd flintsky_management

# 2. Create a Kind cluster (if you don't have one)
kind create cluster --name flintsky

# 3. Build images
docker build -t flintsky/backend:latest .
docker build -t flintsky/frontend:latest ./frontend

# 4. Load images into Kind
kind load docker-image flintsky/backend:latest --name flintsky
kind load docker-image flintsky/frontend:latest --name flintsky

# 5. Deploy using Kustomize
kubectl apply -k k8s/overlays/development/

# 6. Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app=django --timeout=120s
kubectl wait --for=condition=ready pod -l app=postgres --timeout=120s

# 7. Run migrations
kubectl exec deployment/django -- python manage.py migrate

# 8. Create superuser and get API token
kubectl exec -it deployment/django -- python manage.py shell << 'EOF'
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
user, _ = User.objects.get_or_create(username='admin', defaults={'is_staff': True, 'is_superuser': True})
user.set_password('admin')
user.save()
token, _ = Token.objects.get_or_create(user=user)
print(f'API Token: {token.key}')
EOF

# 9. Port-forward to access the services
kubectl port-forward svc/django 8000:8000
# (In another terminal) kubectl port-forward svc/frontend 5173:80
```

The API will be available at: **http://localhost:8000/api/**

**Note:** The K8s overlays use `imagePullPolicy: Never` for local images. For production, update to pull from a container registry.

---

## 📚 API Reference

### Base URL
```
http://localhost:8000/api/
```

### Authentication
All endpoints (except token acquisition) require authentication via **Token Authentication** header:
```
Authorization: Token <your-token-here>
```

### Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/apartments/` | List/create apartments |
| GET/PUT/DELETE | `/api/apartments/{id}/` | Retrieve/update/delete apartment |
| GET/POST | `/api/tenants/` | List/create tenants |
| GET/PUT/DELETE | `/api/tenants/{id}/` | Retrieve/update/delete tenant |
| GET/POST | `/api/leases/` | List/create leases |
| GET/PUT/DELETE | `/api/leases/{id}/` | Retrieve/update/delete lease |
| GET/POST | `/api/maintenance-requests/` | List/create maintenance requests |
| GET/PUT/DELETE | `/api/maintenance-requests/{id}/` | Retrieve/update/delete request |
| GET | `/api/overview/` | Dashboard with stats & upcoming events |
| GET | `/api/leases/upcoming-moveins/` | Leases with move-in within 7 days |
| GET | `/api/leases/upcoming-moveouts/` | Leases with move-out within 7 days |

### Example Requests

#### 1. Get API Token
```bash
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin"}'
```

**Response:**
```json
{
  "token": "a1b2c3d4e5f6g7h8i9j0..."
}
```

#### 2. Create an Apartment
```bash
curl -X POST http://localhost:8000/api/apartments/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Token a1b2c3d4e5f6g7h8i9j0..." \
  -d '{
    "number": "101A",
    "floor": 1,
    "bedrooms": 2,
    "status": "available",
    "notes": "Recently renovated"
  }'
```

#### 3. Create a Tenant
```bash
curl -X POST http://localhost:8000/api/tenants/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Token a1b2c3d4e5f6g7h8i9j0..." \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890"
  }'
```

#### 4. Create a Lease
```bash
curl -X POST http://localhost:8000/api/leases/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Token a1b2c3d4e5f6g7h8i9j0..." \
  -d '{
    "apartment_id": 1,
    "tenant_id": 1,
    "move_in": "2025-04-01",
    "move_out": "2026-03-31",
    "is_active": true
  }'
```

#### 5. Get Dashboard Overview
```bash
curl http://localhost:8000/api/overview/ \
  -H "Authorization: Token a1b2c3d4e5f6g7h8i9j0..."
```

**Response:**
```json
{
  "total_apartments": 10,
  "occupied": 6,
  "available": 4,
  "upcoming_move_ins": [
    {
      "apartment": "101A",
      "tenant": "John Doe",
      "move_in": "2025-04-01",
      "move_out": "2026-03-31"
    }
  ],
  "upcoming_move_outs": []
}
```

#### 6. Create a Maintenance Request
```bash
curl -X POST http://localhost:8000/api/maintenance-requests/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Token a1b2c3d4e5f6g7h8i9j0..." \
  -d '{
    "lease_id": 1,
    "issue": "Leaky faucet in kitchen",
    "status": "open"
  }'
```

---

## 🔐 Authentication

This API uses Django REST Framework's Token Authentication.

### Steps to Authenticate:

1. **Create a user** (via admin or shell)
2. **Obtain a token** via `/api/token/` endpoint
3. **Include the token** in all subsequent requests:
   ```
   Authorization: Token <your-token>
   ```

### Django Admin Access

Access the admin panel at `/admin/` with superuser credentials:
```
http://localhost:8000/admin/
```

---

## 🔧 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SECRET_KEY` | ✅ Yes | - | Django secret key (keep secure!) |
| `DEBUG` | ❌ No | `True` | Debug mode (set `0` or `False` in production) |
| `DATABASE_NAME` | ❌ No | `propertymgmt` | PostgreSQL database name |
| `DATABASE_USER` | ❌ No | `postgres` | PostgreSQL username |
| `DATABASE_PASSWORD` | ❌ No | - | PostgreSQL password |
| `DATABASE_HOST` | ❌ No | `localhost` | PostgreSQL host |
| `DATABASE_PORT` | ❌ No | `5432` | PostgreSQL port |
| `DJANGO_ALLOWED_HOSTS` | ❌ No | `*` | Comma-separated allowed hosts |
| `CORS_ALLOWED_ORIGINS` | ❌ No | `http://localhost:5173` | Additional CORS origins |

---

## 📁 Project Structure

```
flintsky_management/
├── core/                          # Main Django application
│   ├── models.py                  # Data models (Apartment, Tenant, Lease, MaintenanceRequest)
│   ├── views.py                   # API views and ViewSets
│   ├── serializers.py             # DRF serializers
│   ├── urls.py                    # API URL routing
│   ├── admin.py                   # Django admin configuration
│   ├── validators.py              # Custom validators
│   ├── tests.py                   # Unit tests
│   └── migrations/                # Database migrations
├── propertymgmt/                  # Django project configuration
│   ├── settings.py                # Django settings
│   ├── urls.py                    # Root URL configuration
│   ├── wsgi.py                    # WSGI application
│   └── asgi.py                    # ASGI application
├── frontend/                      # React 19 frontend application
│   ├── src/
│   │   ├── components/            # React components (Apartments, Leases, Maintenance, etc.)
│   │   ├── context/               # React context providers
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── pages/                 # Page components
│   │   ├── services/              # API service layer
│   │   ├── assets/                # Static assets
│   │   ├── App.jsx                # Main application component
│   │   └── main.jsx               # Entry point
│   ├── package.json
│   └── vite.config.js
├── monitoring/                    # Monitoring & observability stack
│   ├── grafana/                   # Grafana dashboards & provisioning
│   ├── prometheus/                # Prometheus configuration
│   ├── loki/                      # Loki log aggregation config
│   └── promtail/                  # Promtail log shipper config
├── k8s/                           # Kubernetes manifests (Kustomize)
│   ├── base/                      # Base Kustomize resources
│   │   ├── django/                # Backend deployment, service, HPA
│   │   ├── frontend/              # Frontend deployment, service
│   │   ├── postgres/              # PostgreSQL statefulset, service
│   │   ├── ingress/               # NGINX ingress rules
│   │   ├── configmap.yaml         # Shared ConfigMap
│   │   └── namespace.yaml         # Namespace definition
│   ├── overlays/
│   │   ├── development/           # Dev overlay (Kustomize)
│   │   └── production/            # Prod overlay (Kustomize + patches)
│   ├── propertymgmt-k8s.yaml      # Legacy monolithic K8s manifest
│   ├── frontend-k8s.yaml          # Legacy frontend manifest
│   └── ingress-k8s.yaml           # Legacy ingress manifest
├── bridge/                        # Kompose-generated K8s manifests (desktop-only)
│   ├── base/                      # Base resources
│   └── overlays/                  # Environment overlays
├── scripts/
│   └── k8s-deploy.sh              # Automated K8s deployment script
├── .github/workflows/
│   └── ci-cd.yaml                 # GitHub Actions CI/CD pipeline
├── Dockerfile                     # Backend Docker image
├── docker-compose.yml             # Docker Compose stack
├── requirements.txt               # Python dependencies
├── manage.py                      # Django management script
├── KUBERNETES.md                  # Detailed K8s deployment guide
└── README.md                      # This file
```

### Data Models

```
┌──────────────────────────────────────┐     ┌─────────┐     ┌─────────┐
│  Apartment                           │◄────┤  Lease  ├────►│  Tenant  │
│  - number, floor, bedrooms (1/2)     │     └────┬────┘     └─────────┘
│  - status (available/occupied)       │          │
└──────────────────────────────────────┘          ▼
                                         ┌─────────────────┐
                                         │ MaintenanceRequest│
                                         │ - status: open/closed│
                                         └─────────────────┘
```

---

## 📈 Monitoring & Observability

The project includes a full observability stack:

```bash
# Start monitoring stack with Docker Compose
docker-compose up -d prometheus grafana loki promtail
```

| Service | URL | Credentials |
|---------|-----|-------------|
| **Grafana** | http://localhost:3000 | admin / admin |
| **Prometheus** | http://localhost:9090 | - |
| **Loki** | http://localhost:3100 | - |

### Available Dashboards

| Dashboard | Metrics |
|-----------|---------|
| Django API Overview | Request rate, latency, success rate |
| Errors & Issues | 4xx/5xx error rates, error distribution |
| Database Metrics | Connection count, query duration |
| Model Operations | Insert/update/delete counts |

### Log Aggregation

Application logs are shipped to **Loki** via **Promtail** in JSON format. Access logs in Grafana using the Loki data source.

---

## 🔄 CI/CD

A GitHub Actions workflow (`.github/workflows/ci-cd.yaml`) automates:

- **Testing:** Django tests with PostgreSQL service
- **Linting:** Code quality checks
- **Building:** Docker images for backend & frontend
- **Publishing:** Images to GitHub Container Registry (`ghcr.io`)

Triggers on push to `main`/`develop` branches, version tags (`v*`), and pull requests.

---

## 🐛 Troubleshooting

### Issue: "SECRET_KEY environment variable must be set"
**Solution:** Ensure the `SECRET_KEY` environment variable is set in your `.env` file or K8s Secret.

### Issue: "Database connection refused"
**Solution:**
- With Docker Compose: Ensure the `db` service is running (`docker-compose ps`)
- With K8s: Ensure the postgres pod is ready (`kubectl get pods`)

### Issue: "ImagePullBackOff" in Kubernetes
**Solution:** Make sure you built the image locally and loaded it into Kind:
```bash
docker build -t flintsky/backend:latest .
kind load docker-image flintsky/backend:latest --name flintsky
```

### Issue: "Invalid token" errors
**Solution:**
1. Verify your token is correct
2. Ensure the header format is exactly: `Authorization: Token <token>` (note the space and capitalization)

### Issue: Migrations not applied
**Solution:** Run migrations manually:
```bash
# Docker Compose
docker-compose exec web python manage.py migrate

# Kubernetes
kubectl exec deployment/django -- python manage.py migrate
```

---

## 📝 Notes

- No `.env` files are required for Kubernetes deployment — all configuration is via K8s ConfigMaps and Secrets.
- The development overlay uses `imagePullPolicy: Never` to use locally built images.
- For production deployments, update the overlay to pull from a container registry (e.g., GHCR, DockerHub).
- See **[KUBERNETES.md](KUBERNETES.md)** for a comprehensive cloud migration guide.

---

## 📄 License

This project is open source. See repository for license details.

---

## 🤝 Contributing

Contributions are welcome! Please ensure:
1. Code follows existing style
2. Tests are added for new features
3. Documentation is updated

---

<p align="center">
  Built with ❤️ using Django REST Framework & React
</p>
