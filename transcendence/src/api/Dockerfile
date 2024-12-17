# Use an official Python runtime as a parent image
FROM python:3.9

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/code/backend

# Set the working directory in the container
WORKDIR /code

# Copy the dependencies file to the working directory
COPY src/api/tools/requirements.txt /code/

# Install Python dependencies
RUN pip install -r requirements.txt
RUN mkdir -p /code/static
# Copy the entire backend directory to the container
COPY backend /code/backend
COPY backend/manage.py /code/backend/manage.py
# Copy the entrypoint script into the container
COPY entrypoint.sh /code/entrypoint.sh

# Make sure the entrypoint script is executable
RUN chmod +x /code/entrypoint.sh

# Set the entrypoint to the script
ENTRYPOINT ["/bin/sh", "/code/entrypoint.sh"]
