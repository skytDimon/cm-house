#!/bin/sh
set -e

# Start Uvicorn in the background
uvicorn main:app --host 127.0.0.1 --port 8000 --workers 2 --app-dir /app/backend &

# Start Nginx in the foreground
nginx -g "daemon off;"
