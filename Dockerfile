# Dockerfile

FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        python3-dev \
        libffi-dev \
        libssl-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN python -m pip install --upgrade pip setuptools wheel

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn

# Copy the application code
COPY . .

# [OPTIONAL] If using a service account key, set the env variable:
# ENV GOOGLE_APPLICATION_CREDENTIALS="/app/service_account_key.json"

EXPOSE 5001

# Use Gunicorn to run the Flask app; the app is located at ai/vertex_testing.py
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "ai.vertex_testing:app"]