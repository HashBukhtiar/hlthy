# HLTHY AI Coach — Slim Production Image
# ~300MB (down from ~2GB with sentence-transformers)
FROM python:3.11-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY ai/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY ai/ .

ENV PYTHONPATH=/app \
    PYTHONUNBUFFERED=1

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

EXPOSE 8080

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "2"]
