# Loki Log Aggregation Setup

This guide explains how to use Loki for log aggregation with the Property Management API.

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Django    │────►│  Promtail   │────►│    Loki     │
│   (logs)    │     │ (log shipper)│     │  (storage)  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                        ┌──────▼──────┐
                                        │   Grafana   │
                                        │  (display)  │
                                        └─────────────┘
```

## Components

| Component | Purpose | Port |
|-----------|---------|------|
| **Loki** | Log storage and query engine | 3100 |
| **Promtail** | Log shipper (collects and sends logs to Loki) | 9080 |
| **Grafana** | Visualization (already configured with Loki datasource) | 3000 |

## Quick Start

### 1. Start all services

```bash
docker-compose up -d
```

This will start:
- Django API (web)
- PostgreSQL (db)
- React Frontend (frontend)
- Prometheus
- Grafana
- **Loki** (new)
- **Promtail** (new)

### 2. Verify Loki is running

```bash
# Check Loki health
curl http://localhost:3100/ready

# Should return: "ready"
```

### 3. Access Grafana

1. Open http://localhost:3000
2. Login with `admin/admin`
3. Go to **Explore** (left sidebar)
4. Select **Loki** from the datasource dropdown

## Querying Logs in Grafana

### Basic Queries

```logql
# All Django logs
{job="django"}

# All Docker container logs
{job="docker"}

# Logs from a specific container
{job="docker", container="flintsky_management-web-1"}
```

### Filter by Level

```logql
# Error logs only
{job="django"} |= "level\": \"ERROR\""

# Warning and above
{job="django"} |= "level\": \"WARN\""

# Specific error messages
{job="django"} |= "ValidationError"
```

### Filter by API Endpoint

```logql
# API request logs
{job="django"} |= "/api/"

# Specific endpoint
{job="django"} |= "/api/apartments/"
```

### Time-based Queries

```logql
# Last 5 minutes
{job="django"} [5m]

# Last hour with errors only
{job="django"} |= "ERROR" [1h]
```

## Log Format

Django logs are output in JSON format:

```json
{
  "timestamp": "2026-03-29T14:30:00.123456",
  "level": "INFO",
  "message": "GET /api/apartments/ 200 OK",
  "logger": "django.request"
}
```

## Configuration Files

| File | Purpose |
|------|---------|
| `monitoring/loki/loki-config.yml` | Loki server configuration |
| `monitoring/promtail/promtail-config.yml` | Promtail agent configuration |
| `monitoring/grafana/provisioning/datasources/datasources.yml` | Grafana datasource auto-provisioning |

## Troubleshooting

### No logs appearing in Grafana

1. Check if log file exists:
   ```bash
   docker-compose exec web ls -la /var/log/django/
   ```

2. Check Promtail is sending logs:
   ```bash
   docker-compose logs promtail
   ```

3. Check Loki is receiving logs:
   ```bash
   docker-compose logs loki
   ```

### Permission denied on log directory

```bash
# Fix permissions
docker-compose exec web chmod 755 /var/log/django
docker-compose exec web touch /var/log/django/django.log
docker-compose exec web chmod 666 /var/log/django/django.log
```

### Reset everything

```bash
# Stop and remove volumes
docker-compose down -v

# Restart
docker-compose up -d
```

## Advanced: Custom Log Labels

To add custom labels (e.g., user_id, request_id), modify the logging in your Django views:

```python
import logging

logger = logging.getLogger('core')

# In your view:
logger.info(f'Creating apartment', extra={
    'user_id': request.user.id,
    'apartment_number': data.get('number')
})
```

Then update `promtail-config.yml` to extract these fields.

## Useful Links

- [Loki Documentation](https://grafana.com/docs/loki/latest/)
- [LogQL Query Language](https://grafana.com/docs/loki/latest/logql/)
- [Promtail Configuration](https://grafana.com/docs/loki/latest/send-data/promtail/)
