#!/bin/sh
set -e
# Creates tables, the admin user and first inventory (only when missing), then starts the API.
python -m app.cli bootstrap
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --proxy-headers --forwarded-allow-ips="*"
