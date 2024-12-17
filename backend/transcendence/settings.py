import os
from pathlib import Path
from datetime import timedelta
from decouple import config

# Base directory of the project
# Modify BASE_DIR to be the root of the project
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Secret key (make sure it's secure)
SECRET_KEY = config("SECRET_KEY")

# Debug mode
DEBUG = True

HOST_HOSTNAME = config('HOST_HOSTNAME', default='localhost')

# Allowed hosts
ALLOWED_HOSTS = ['0.0.0.0', '127.0.0.1', 'localhost', HOST_HOSTNAME]

# Installed applications
INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'homegame',
    'rest_framework',
    'rest_framework.authtoken',
    'rest_framework_simplejwt',
    'chat',
	'game',
    'channels' # Uncomment if you plan to use Django Channels
]
# settings.py
AUTH_USER_MODEL = 'homegame.User'

REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.LimitOffsetPagination',
    'PAGE_SIZE': 100,
    'DEFAULT_AUTHENTICATION_CLASSES': ('rest_framework_simplejwt.authentication.JWTAuthentication',)
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=180),  # Durée de vie du token d'accès
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),    # Durée de vie du token de rafraîchissement
    'SIGNING_KEY': SECRET_KEY,                      # Clé pour signer les tokens
}

# Middleware
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
	'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # 'homegame.middleware.CheckAuthMiddleware',
]

# URL configuration
ROOT_URLCONF = 'transcendence.urls'

# Templates configuration
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'backend/templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# WSGI application
WSGI_APPLICATION = 'transcendence.wsgi.application'

# ASGI application
ASGI_APPLICATION = 'transcendence.asgi.application'

# Channel layers configuration (using Redis)
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [('redis', 6379)],
        },
    },
}

# Database configuration (default SQLite)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'mydb',
        'USER': config('DB_USER'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': 'db',  # This should remain 'db' as per the service name in Docker Compose
        'PORT': '5432', # Default PostgreSQL port
    }
}


# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Europe/Paris'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'

# Directory where `collectstatic` will collect static files
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Directories containing static files to include
STATICFILES_DIRS = [
    BASE_DIR / 'frontend',  # This will make Django collect files from the frontend directory
]

# Media files configuration
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type;
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CORS_ALLOWED_ORIGINS = [
    "http://127.0.0.1:8080",
    "http://0.0.0.0:8080",
	f"http://{HOST_HOSTNAME}:8080",
	f"https://{HOST_HOSTNAME}:8443",
]

SESSION_ENGINE = 'django.contrib.sessions.backends.db'  # Utilisation de la base de données pour stocker les sessions

SESSION_COOKIE_AGE = 1209600  # Durée de vie de la session en secondes (ici 2 semaines)
SESSION_COOKIE_SECURE = False  # Mettez True en production si vous utilisez HTTPS
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_NAME = 'sessionid'
SESSION_COOKIE_DOMAIN = '.clusters.42paris.fr'
# Définit le chemin pour lequel le cookie est valide
SESSION_COOKIE_PATH = '/'  # Par défaut, le cookie est valable pour toute l'application
CSRF_COOKIE_SAMESITE = 'None'

EMAIL_USER = config('GMAIL_USER')
EMAIL_PASSWORD = config('GMAIL_PASSWORD')
SESSION_COOKIE_SAMESITE = 'None'

CSRF_TRUSTED_ORIGINS = ['http://localhost:8000', 'http://localhost:8080',  f"http://{HOST_HOSTNAME}:8080", f"https://{HOST_HOSTNAME}:8443"]

# EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = EMAIL_USER  # Ton adresse Gmail
EMAIL_HOST_PASSWORD = EMAIL_PASSWORD  # Ton mot de passe Gmail ou un mot de passe d'application
DEFAULT_FROM_EMAIL = EMAIL_USER

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django.security.csrf': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
    },
}

