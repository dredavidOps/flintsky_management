# 🏢 Flintsky Management – Property Management Platform

A RESTful API for property management built with **Django REST Framework** and **PostgreSQL**. Designed to help property managers oversee apartment availability, track leases, manage tenants, and handle maintenance requests.

[![Django](https://img.shields.io/badge/Django-5.2.4-green.svg)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/DRF-3.16.0-red.svg)](https://www.django-rest-framework.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-blue.svg)](https://www.docker.com/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-ready-blue.svg)](https://kubernetes.io/)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
  - [Option 1: Local Development (Docker Compose)](#option-1-local-development-with-docker-compose-recommended)
  - [Option 2: Kubernetes with Kind](#option-2-kubernetes-with-kind)
- [API Reference](#-api-reference)
- [Authentication](#-authentication)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)
- [Troubleshooting](#-troubleshooting)

---

## 🚀 Features

| Feature | Description |
|---------|-------------|
| 🏠 **Apartment Management** | Track apartment numbers, floors, and availability status |
| 👥 **Tenant Management** | Store tenant contact information (name, email, phone) |
| 📝 **Lease Tracking** | Manage move-in/move-out dates and lease status |
| 🔧 **Maintenance Requests** | Create and track maintenance issues linked to leases |
| 📊 **Dashboard Overview** | Get occupancy stats and upcoming move-ins/outs |
| 🔐 **Token Authentication** | Secure API access with DRF token auth |

---

## 📦 Tech Stack

- **Backend:** Django 5.2.4 + Django REST Framework 3.16.0
- **Database:** PostgreSQL 15
- **WSGI Server:** Gunicorn
- **Containerization:** Docker
- **Orchestration:** Kubernetes (Kind for local development)
- **Authentication:** Token Authentication (DRF)

---

## 🏁 Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/) (for K8s deployment)
- [Kind](https://kind.sigs.k8s.io/docs/user/quick-start/) (optional, for local K8s cluster)

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

---

### Option 2: Kubernetes with Kind

For production-like deployment locally:

```bash
# 1. Clone and navigate
git clone git@github.com:dredavidOps/flintsky_management.git
cd flintsky_management

# 2. Create a Kind cluster (if you don't have one)
kind create cluster --name flintsky

# 3. Build the Docker image
docker build -t propertymgmt:local .

# 4. Load the image into Kind
kind load docker-image propertymgmt:local --name flintsky

# 5. Deploy to Kubernetes
kubectl apply -f k8s/propertymgmt-k8s.yaml

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

# 9. Port-forward to access the API
kubectl port-forward svc/django 8000:8000
```

The API will be available at: **http://localhost:8000/api/**

**Note:** The K8s manifest uses `imagePullPolicy: Never` to use the locally built image.

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
│   └── migrations/                # Database migrations
├── propertymgmt/                  # Django project configuration
│   ├── settings.py                # Django settings
│   ├── urls.py                    # Root URL configuration
│   └── wsgi.py                    # WSGI application
├── k8s/
│   └── propertymgmt-k8s.yaml      # Kubernetes manifests
├── Dockerfile                     # Docker image configuration
├── requirements.txt               # Python dependencies
├── manage.py                      # Django management script
└── README.md                      # This file
```

### Data Models

```
┌─────────────┐     ┌─────────┐     ┌─────────┐
│  Apartment  │◄────┤  Lease  ├────►│  Tenant  │
└─────────────┘     └────┬────┘     └─────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ MaintenanceRequest│
                └─────────────────┘
```

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
docker build -t propertymgmt:local .
kind load docker-image propertymgmt:local --name flintsky
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

- No `.env` files are required for Kubernetes deployment—all configuration is via K8s ConfigMaps and Secrets.
- The `imagePullPolicy: Never` setting in K8s manifests ensures the locally built image is used.
- For production deployments, update the manifest to pull from a container registry (e.g., DockerHub).

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
  Built with ❤️ using Django REST Framework
</p>
