from .settings import *
import os
from dotenv import load_dotenv
import dj_database_url
import urllib.parse

load_dotenv()

# Production settings
DEBUG = True  # Temporarily set to True to see errors
ALLOWED_HOSTS = ['real-time-distributed-chat-application-nm1q.onrender.com', '.onrender.com']

# Database
DATABASE_URL = os.getenv('DATABASE_URL')
if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
        )
    }

# Redis Configuration
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')

# Configure channel layers with Redis
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [REDIS_URL],
        },
    },
}

# Configure Caching with Redis
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': REDIS_URL,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Static files
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATIC_URL = '/static/'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Message settings
MESSAGE_STORAGE = 'django.contrib.messages.storage.session.SessionStorage'

# Security settings
CSRF_TRUSTED_ORIGINS = ['https://real-time-distributed-chat-application-nm1q.onrender.com']
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Disable HSTS to prevent redirect loops
SECURE_HSTS_SECONDS = 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False

# Additional security headers
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
