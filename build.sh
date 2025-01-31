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
python << END
import os
import redis
import time
import sys

redis_url = os.getenv('REDIS_URL')
if redis_url:
    redis_client = redis.from_url(redis_url)
    max_retries = 5
    current_try = 0
    while current_try < max_retries:
        try:
            redis_client.ping()
            print("Successfully connected to Redis")
            sys.exit(0)
        except redis.ConnectionError:
            current_try += 1
            if current_try == max_retries:
                print("Could not connect to Redis after {} attempts".format(max_retries))
                sys.exit(1)
            print("Waiting for Redis to be ready... (attempt {}/{})".format(current_try, max_retries))
            time.sleep(2)
END
