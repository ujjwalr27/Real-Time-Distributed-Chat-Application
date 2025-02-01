#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create static directory if it doesn't exist
mkdir -p staticfiles

# Collect static files
python manage.py collectstatic --no-input --clear

# Apply database migrations
python manage.py migrate --no-input

# Create cache table for sessions
python manage.py createcachetable

# Wait for Redis to be ready (added retry mechanism)
# Wait for Redis to be ready (added retry mechanism)
python << END
import os
import redis
import time
import sys
import urllib.parse

redis_url = os.getenv('REDIS_URL')
if redis_url:
    # Parse Redis URL to handle SSL if present
    parsed_url = urllib.parse.urlparse(redis_url)
    ssl = parsed_url.scheme == 'rediss'
    
    redis_client = redis.from_url(
        redis_url,
        ssl_cert_reqs=None if ssl else None
    )
    max_retries = 5
    current_try = 0
    while current_try < max_retries:
        try:
            redis_client.ping()
            print("Successfully connected to Redis")
            sys.exit(0)
        except redis.ConnectionError as e:
            current_try += 1
            if current_try == max_retries:
                print(f"Could not connect to Redis after {max_retries} attempts: {str(e)}")
                sys.exit(1)
            print(f"Waiting for Redis to be ready... (attempt {current_try}/{max_retries})")
            time.sleep(2)
END