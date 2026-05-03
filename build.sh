#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt

# Ensure log directory exists (fallbacks to BASE_DIR/logs in settings.py if /var/log isn't writable)
mkdir -p /var/log/django || true

python manage.py collectstatic --no-input
python manage.py migrate
