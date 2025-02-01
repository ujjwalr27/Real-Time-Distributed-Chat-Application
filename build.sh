#!/usr/bin/env bash
# exit on error
set -o errexit

# Install dependencies
pip install -r requirements.txt

# Collect static files
python manage.py collectstatic --no-input

# Apply database migrations
python manage.py migrate

# Create cache table for sessions
python manage.py createcachetable

# Wait for Redis to be ready
python << END
import os
import redis
import time
import sys

redis_url = os.getenv('REDIS_URL')
if redis_url:
    try:
        redis_client = redis.from_url(redis_url)
        redis_client.ping()
        print("Successfully connected to Redis")
        sys.exit(0)
    except Exception as e:
        print(f"Error connecting to Redis: {str(e)}")
        sys.exit(1)
END