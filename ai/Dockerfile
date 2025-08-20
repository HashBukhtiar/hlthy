FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for sentence-transformers and FAISS
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY vertex_testing.py .
COPY exercise_safety.py .
COPY user_profiles.py .
COPY semantic_memory.py .

# Copy Google Cloud credentials if they exist (optional)
COPY service-account-key.json* ./

# Create directories for persistent data
RUN mkdir -p user_profiles memory_data

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PORT=5001

# Note: GOOGLE_APPLICATION_CREDENTIALS should be set at runtime
# Example: docker run -e GOOGLE_APPLICATION_CREDENTIALS=/app/service-account-key.json

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5001/api/health || exit 1

# Run the Flask application
CMD ["python", "vertex_testing.py"]
