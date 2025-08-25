# HLTHY AI Coach Production Dockerfile - Optimized
# Use Python image with pre-built scientific libraries to avoid build issues
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Upgrade pip and install wheel support
RUN python -m pip install --upgrade pip wheel

# Install minimal ML dependencies without heavy models
RUN pip install --no-cache-dir \
    numpy==1.24.3 \
    scipy==1.10.1 \
    scikit-learn==1.2.2

# Copy requirements and install remaining dependencies (excluding heavy ML libraries)
COPY ai/requirements-minimal.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ai/ ./

# Create necessary directories
RUN mkdir -p exercise_cache user_profiles memory_data rate_limiting_cache

# Set environment variables for production
ENV FLASK_ENV=production
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV TRANSFORMERS_CACHE=/tmp/transformers_cache
ENV HF_HOME=/tmp/huggingface

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Expose port
EXPOSE 8080

# Use Gunicorn with optimized settings for production
CMD ["gunicorn", \
     "--bind", "0.0.0.0:8080", \
     "--workers", "2", \
     "--worker-class", "sync", \
     "--timeout", "120", \
     "--max-requests", "1000", \
     "--max-requests-jitter", "50", \
     "--preload", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "vertex_testing:app"]