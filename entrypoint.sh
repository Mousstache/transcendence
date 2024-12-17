#!/bin/sh
# This script should contain the actual commands to be executed

python /code/backend/manage.py makemigrations

# Run database migrations
python /code/backend/manage.py migrate

python /code/backend/manage.py init_local_dev

# Start the Django development server
python /code/backend/manage.py runserver 0.0.0.0:8000
