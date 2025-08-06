# 🏢 Flintsky Management – Property Management Platform

This project is a **property management web app** built with Django REST Framework and PostgreSQL, containerized with Docker and orchestrated for deployment on Kubernetes (K8s). It helps property managers oversee apartment availability, track leases, manage tenants, and handle maintenance requests efficiently.

---

## 📦 Tech Stack

- **Backend:** Django + Django REST Framework
- **Database:** PostgreSQL
- **Containerization:** Docker
- **Orchestration:** Kubernetes (works with Kind for local dev)
- **Config & Secrets:** K8s ConfigMap & Secrets

---

## 🚀 Features

- **View apartment availability (occupied/available)**
- **Track leases, tenants, move-ins/outs**
- **Create/manage maintenance requests**
- **API endpoints for all major entities**
- **Admin dashboard via Django admin**

---

## 🏁 Quick Start (Local Dev with Kind)

## 📝 Notes
 - **No .env files or Docker Compose needed—all configuration is via K8s manifests.
 - **Noteworthy is that since this is a local deployment first, remember to ensure in the manifest you maintain the value 'Never' for 'imagePullPolicy'.
 - **Once you have an image published in dockerhub, you can reference and pull that to use for your own deployments.

### 1. **Clone the Repository**

```bash
git clone git@github.com:dredavidOps/flintsky_management.git
cd flintsky_management
